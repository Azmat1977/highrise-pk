// pages/agent/[slug].tsx
// Public Agent Profile Page -- Enterprise Refactor
// Standardized to Universal Design System tokens and icons registry
// Enforces Pattern C Detail Page layout with natural-scroll 3-card stack sidebar
// Pure ASCII comments | Zero react-hot-toast

import React, { useState, useCallback, useMemo } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dbConnect from '@/lib/dbConnect';
import ShareMenu from '@/components/projects/ShareMenu';
import { icons, nearbyIcons } from '@/lib/design-system/icons';
import { colors, containers, grids, radii, shadows } from '@/lib/design-system/tokens';
import { typography } from '@/lib/design-system/typography';
import { card, button, badge, safety } from '@/lib/design-system/components';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';

import UniversalContactCard from '@/components/shared/UniversalContactCard';
import SafeDealSidebarCard from '@/components/shared/SafeDealSidebarCard';
import SafetyWarningCard from '@/components/shared/SafetyWarningCard';
import ReportListingModal from '@/components/property/ReportListingModal';

// Using Swiper - industry-standard carousel
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const SWIPER_CUSTOM_STYLES = `
  .highrise-review-swiper .swiper-pagination-bullet,
  .highrise-property-swiper .swiper-pagination-bullet {
    background: #cbd5e1;
    opacity: 1;
    width: 8px;
    height: 8px;
    transition: all 0.3s;
  }
  .highrise-review-swiper .swiper-pagination-bullet-active,
  .highrise-property-swiper .swiper-pagination-bullet-active {
    background: #029bba;
    width: 24px;
    border-radius: 4px;
  }
  .highrise-review-swiper,
  .highrise-property-swiper {
    padding-bottom: 50px !important;
  }
  .highrise-property-swiper .swiper-slide {
    height: auto;
  }
`;

// ============================================================================
// SERIALIZATION HELPER (Edge Safety for undefined values)
// ============================================================================

function serializeForNext<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null) return value;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toString' in value &&
    value.constructor?.name === 'ObjectId'
  ) {
    return String(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => serializeForNext(v)) as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue;
      result[key] = serializeForNext(val);
    }
    return result as unknown as T;
  }
  return value;
}

// ============================================================================
// TYPES
// ============================================================================

interface AgentSocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
}

interface AgentStats {
  activeListings: number;
  soldProperties: number;
  rentedProperties: number;
  responseRate?: number;
}

interface AgentRatings {
  averageRating: number;
  totalReviews: number;
}

interface PublicAgent {
  _id: string;
  slug: string;
  displayName: string;
  tagline?: string;
  about?: string;
  agentType: 'individual' | 'agency' | 'freelance';
  agencyName?: string;
  city: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  officeVerification?: {
    address?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  experience?: {
    years: number;
    totalDeals?: number;
    totalValue?: number;
  };
  serviceAreas?: {
    cities?: string[];
    localities?: string[];
  };
  specializations?: string[];
  languages?: string[];
  socialLinks?: AgentSocialLinks;
  businessHours?: {
    weekdays?: string;
    weekends?: string;
  };
  documents?: {
    profilePhoto?: { url?: string };
    coverPhoto?: { url?: string };
  };
  agencyLogo?: { url?: string };
  verificationLevel?:
    | 'not_verified'
    | 'documents_pending'
    | 'basic_verified'
    | 'license_verified'
    | 'full_verified'
    | 'premium_verified';
  stats?: AgentStats;
  ratings?: AgentRatings;
  createdAt?: string;
  reviews?: Array<{
    _id?: string;
    rating: number;
    reviewText: string;
    reviewerName: string;
    reviewerCity?: string;
    source: string;
    addedAt: string;
  }>;
}

interface PublicProperty {
  _id: string;
  title: string;
  slug?: string;
  price: number;
  totalPrice?: number;
  area: number;
  unit: string;
  city: string;
  locality?: string;
  society?: string;
  propertyType: string;
  listingType: string;
  bedrooms?: number;
  bathrooms?: number;
  images?: { url: string }[];
}

interface PageProps {
  agent: PublicAgent;
  properties: PublicProperty[];
}

type ActiveTab = 'all' | 'sale' | 'rent';

const PROPERTY_CATEGORIES = [
  {
    key: 'all',
    label: 'All',
    icon: '🏘️',
    matches: (_p: PublicProperty) => true,
  },
  {
    key: 'residential',
    label: 'Residential',
    icon: '🏠',
    matches: (p: PublicProperty) => {
      const t = (p.propertyType ?? '').toLowerCase();
      return ['house', 'flat', 'apartment', 'penthouse', 'villa', 'farmhouse', 'room', 'residential'].includes(t);
    },
  },
  {
    key: 'commercial',
    label: 'Commercial',
    icon: '🏢',
    matches: (p: PublicProperty) => {
      const t = (p.propertyType ?? '').toLowerCase();
      return ['office', 'shop', 'warehouse', 'factory', 'building', 'commercial', 'retail'].includes(t);
    },
  },
  {
    key: 'plots',
    label: 'Plots & Land',
    icon: '🌍',
    matches: (p: PublicProperty) => {
      const t = (p.propertyType ?? '').toLowerCase();
      return ['plot', 'land', 'agricultural', 'commercial-plot', 'residential-plot'].includes(t);
    },
  },
  {
    key: 'rental',
    label: 'For Rent',
    icon: '🔑',
    matches: (p: PublicProperty) => p.listingType === 'rent',
  },
] as const;

type PropertyCategory = typeof PROPERTY_CATEGORIES[number]['key'];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://highrise.pk';

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000) return `${(price / 100_000).toFixed(2)} Lac`;
  return price.toLocaleString();
}

function formatMemberSince(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
  });
}

function sanitizeForJsonLd(str: string): string {
  return str
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027');
}

function getVerificationConfig(level?: string): {
  label: string;
  bg: string;
  text: string;
  show: boolean;
} {
  const map: Record<string, { label: string; bg: string; text: string; show: boolean }> = {
    not_verified: { label: 'Not Verified', bg: 'bg-gray-100', text: 'text-gray-600', show: false },
    documents_pending: { label: 'Pending Verification', bg: 'bg-yellow-100', text: 'text-yellow-700', show: true },
    basic_verified: { label: 'Basic Verified', bg: 'bg-blue-100', text: 'text-blue-700', show: true },
    license_verified: { label: 'License Verified', bg: 'bg-indigo-100', text: 'text-indigo-700', show: true },
    full_verified: { label: 'Verified Agent', bg: 'bg-green-100', text: 'text-green-700', show: true },
    premium_verified: { label: 'Premium Agent', bg: 'bg-purple-100', text: 'text-purple-700', show: true },
  };
  return map[level ?? 'not_verified'] ?? map.not_verified;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-400';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

function StatCard({ label, value, color, bg }: StatCardProps) {
  return (
    <div className={`p-4 rounded-xl border border-gray-100 text-center ${bg}`}>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
      {children}
    </h3>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-600"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ColorChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1 bg-[#029bba]/10 rounded-xl text-xs font-bold text-[#004063]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// OFFICE LOCATION CARD (V6.9.0 Refactored)
// ============================================================================

interface OfficeLocationCardProps {
  address: string;
  city: string;
  coordinates?: { latitude: number; longitude: number };
  agentName: string;
  onCopySuccess: (v: boolean) => void;
  addressCopied: boolean;
}

function OfficeLocationCard({
  address,
  city,
  coordinates,
  agentName,
  onCopySuccess,
  addressCopied,
}: OfficeLocationCardProps): React.ReactElement {
  const [mapError, setMapError] = useState(false);
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const directionsUrl = coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}, Pakistan`)}`;

  const viewMapUrl = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Pakistan`)}`;

  const staticMapUrl = coordinates && googleMapsKey && !mapError
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.latitude},${coordinates.longitude}&zoom=16&size=600x300&scale=2&maptype=roadmap&markers=color:red%7Csize:mid%7C${coordinates.latitude},${coordinates.longitude}&key=${googleMapsKey}`
    : null;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${address}, ${city}, Pakistan`);
      onCopySuccess(true);
      setTimeout(() => onCopySuccess(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h4 className={typography.sectionTitlePlain}>Office Presence</h4>
        {coordinates && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <icons.CheckCircle className="w-3.5 h-3.5" />
            Verified Location
          </span>
        )}
      </div>

      {staticMapUrl && (
        <a
          href={viewMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block h-44 bg-gray-100 rounded-xl overflow-hidden group border border-gray-150"
          aria-label="Open interactive map in new tab"
        >
          <Image
            src={staticMapUrl}
            alt={`Map of ${agentName}'s office`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 1024px) 100vw, 400px"
            unoptimized
            onError={() => setMapError(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <icons.Maximize2 className="w-3.5 h-3.5" />
              View Larger Map
            </span>
          </div>
        </a>
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <icons.MapPin className="w-4 h-4 text-[#029bba] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-700 leading-relaxed font-semibold">
            {address}
            {city && <span className="block text-gray-400 font-medium">{city}, Pakistan</span>}
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-[#029bba] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#029bba]/20 hover:bg-[#027a94]"
          >
            Get Directions
          </a>
          <button
            onClick={handleCopyAddress}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              addressCopied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-[#029bba] hover:text-[#029bba]'
            }`}
          >
            {addressCopied ? 'Address Copied!' : 'Copy Address'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROPERTY CARD COMPONENT
// ============================================================================

function PropertyCard({ property }: { property: PublicProperty }) {
  const imgUrl = property.images?.[0]?.url;
  const href = `/property/${property.slug ?? property._id}`;
  const isRent = property.listingType === 'rent';

  return (
    <Link href={href} className="group block h-full">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between">
        <div className="relative h-48 bg-gray-50 overflow-hidden">
          {imgUrl ? (
            <Image
              src={getOptimizedImageUrl(imgUrl, { width: 500 })}
              alt={property.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200">
              <icons.Home className="w-10 h-10" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase rounded-lg">
              {isRent ? 'For Rent' : 'For Sale'}
            </span>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#004063] group-hover:text-[#029bba] transition-colors mb-1 line-clamp-1 text-sm">
              {property.title}
            </h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
              <icons.MapPin className="w-3.5 h-3.5 shrink-0 text-[#029bba]" />
              <span className="truncate">
                {property.society ?? property.locality ?? property.city}
              </span>
            </p>

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <icons.Maximize className="w-3.5 h-3.5 text-[#029bba]" />
                {property.area} {property.unit}
              </span>
              {property.bedrooms && (
                <span className="flex items-center gap-1 border-l border-gray-200 pl-3">
                  <icons.Bed className="w-3.5 h-3.5 text-[#029bba]" />
                  {property.bedrooms} Bed
                </span>
              )}
              {property.bathrooms && (
                <span className="flex items-center gap-1 border-l border-gray-200 pl-3">
                  <icons.Bath className="w-3.5 h-3.5 text-[#029bba]" />
                  {property.bathrooms} Bath
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Price</p>
              <p className="text-base font-black text-[#029bba]">
                PKR {formatPrice(property.totalPrice ?? property.price)}
                {isRent && <span className="text-xs font-medium text-gray-400">/mo</span>}
              </p>
            </div>
            <span className="p-2 rounded-xl bg-gray-50 text-gray-600 group-hover:bg-[#029bba] group-hover:text-white transition-colors">
              <icons.ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function InsightCard({ agent }: { agent: PublicAgent }) {
  const verification = getVerificationConfig(agent.verificationLevel);
  const hasReviews  = (agent.ratings?.totalReviews ?? 0) > 0;
  const ratingPct   = ((agent.ratings?.averageRating ?? 0) / 5) * 100;
  const responsePct = agent.stats?.responseRate ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
          <icons.ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#004063]">
            Highrise Insight
          </h3>
          <p className="text-xs text-gray-500">Verified platform credentials</p>
        </div>
      </div>

      <div className="space-y-4">
        {hasReviews && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-600 font-bold">Client Rating</span>
              <span className="text-sm font-black text-gray-900">
                {agent.ratings!.averageRating.toFixed(1)}/5
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreColor(ratingPct)}`}
                style={{ width: `${ratingPct}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 font-semibold">
              <icons.CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {agent.ratings!.totalReviews} verified reviews
            </p>
          </div>
        )}

        {responsePct > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-600 font-bold">Response Rate</span>
              <span className="text-sm font-black text-gray-900">{responsePct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreColor(responsePct)}`}
                style={{ width: `${responsePct}%` }}
              />
            </div>
          </div>
        )}

        {verification.show && (
          <div className="pt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${verification.bg} ${verification.text}`}
            >
              <icons.CheckCircle className="w-3.5 h-3.5" />
              {verification.label}
            </span>
          </div>
        )}

        {agent.createdAt && (
          <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100 font-medium">
            Active member since {formatMemberSince(agent.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AgentPublicProfilePage({
  agent,
  properties,
}: PageProps) {
  const [addressCopied, setAddressCopied] = useState(false);
  const [activePropertyCategory, setActivePropertyCategory] = useState<PropertyCategory>('all');
  const [shareOpen, setShareOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const activeCategoryConfig = PROPERTY_CATEGORIES.find((c) => c.key === activePropertyCategory)
    ?? PROPERTY_CATEGORIES[0];
  const filteredProperties = properties.filter((p) => activeCategoryConfig.matches(p));

  const categoryCounts = PROPERTY_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = properties.filter((p) => cat.matches(p)).length;
    return acc;
  }, {} as Record<PropertyCategory, number>);

  const pageUrl = `${APP_URL}/agent/${agent.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: sanitizeForJsonLd(agent.displayName),
    url: pageUrl,
    image: agent.documents?.profilePhoto?.url ?? agent.agencyLogo?.url ?? undefined,
    description: sanitizeForJsonLd(
      agent.about ?? `Verified real estate agent in ${agent.city}, Pakistan`
    ),
    ...(agent.phone && { telephone: agent.phone }),
    ...(agent.email && { email: agent.email }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: sanitizeForJsonLd(agent.city),
      addressCountry: 'PK',
      ...(agent.officeVerification?.address && {
        streetAddress: sanitizeForJsonLd(agent.officeVerification.address),
      }),
    },
    ...(agent.ratings && agent.ratings.totalReviews > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: agent.ratings.averageRating,
        reviewCount: agent.ratings.totalReviews,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    sameAs: Object.values(agent.socialLinks ?? {}).filter(
      (v): v is string => typeof v === 'string' && v.length > 0
    ),
  };

  const ogImage = agent.documents?.coverPhoto?.url ?? agent.documents?.profilePhoto?.url ?? `${APP_URL}/og-agent.jpg`;
  const profilePhotoUrl = agent.documents?.profilePhoto?.url;

  return (
    <>
      <Head>
        <title>{`${agent.displayName} - Real Estate Agent in ${agent.city} | Highrise.pk`}</title>
        <meta
          name="description"
          content={`${agent.displayName} is a verified real estate agent in ${agent.city}. ${agent.experience?.years ?? 0}+ years experience. ${agent.stats?.activeListings ?? 0} active listings. Contact on Highrise.pk.`}
        />
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="index, follow" />

        <meta property="og:type" content="profile" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={`${agent.displayName} | Real Estate Agent in ${agent.city}`} />
        <meta property="og:description" content={agent.tagline ?? `Professional real estate agent based in ${agent.city}, Pakistan.`} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Highrise.pk" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${agent.displayName} | Highrise.pk`} />
        <meta name="twitter:description" content={agent.tagline ?? `Real estate agent in ${agent.city}`} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="min-h-screen bg-[#f8f9fa]">

        {/* Cover Hero Banner */}
        <div className="relative h-48 sm:h-64 md:h-80 w-full bg-gradient-to-r from-[#004063] to-[#029bba] overflow-hidden">
          {agent.documents?.coverPhoto?.url && (
            <>
              <Image
                src={getOptimizedImageUrl(agent.documents.coverPhoto.url, { width: 1440 })}
                alt={`${agent.displayName} cover`}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-black/35" />
            </>
          )}

          {/* Breadcrumb Overlay */}
          <div className="absolute top-4 left-4 sm:left-6 z-10">
            <nav className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md text-white text-xs font-semibold">
              <Link href="/" className="hover:text-[#029bba] transition-colors flex items-center gap-1">
                <icons.Home className="w-3.5 h-3.5" />
                Home
              </Link>
              <span className="opacity-40">/</span>
              <Link href="/agents" className="hover:text-[#029bba] transition-colors">
                Agents
              </Link>
              <span className="opacity-40">/</span>
              <span className="truncate max-w-[160px] text-white/90">{agent.displayName}</span>
            </nav>
          </div>

          {/* Share Button */}
          <button
            onClick={() => setShareOpen(true)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30 transition-colors text-xs font-bold"
            aria-label="Share profile"
          >
            <icons.Share2 className="w-3.5 h-3.5" />
            Share Profile
          </button>
        </div>

        {/* Agent Profile Block */}
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 relative -mt-16 z-20 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">

              {/* Photos row: Agent avatar + Agency logo */}
              <div className="flex items-start gap-4 -mt-12 md:-mt-16 relative z-10 shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 border-white bg-gradient-to-br from-[#029bba] to-[#004063] overflow-hidden shadow-md flex items-center justify-center">
                  {profilePhotoUrl ? (
                    <img
                      src={getOptimizedImageUrl(profilePhotoUrl, { width: 250 })}
                      alt={agent.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-4xl font-black">{agent.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {agent.agentType === 'agency' && agent.agencyLogo?.url && (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 border-white bg-white p-3 shadow-md flex items-center justify-center shrink-0">
                    <img
                      src={getOptimizedImageUrl(agent.agencyLogo.url, { width: 250 })}
                      alt={agent.agencyName || 'Agency'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Title, Branded badging */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className={typography.pageTitle}>{agent.displayName}</h1>
                  {agent.verificationLevel && agent.verificationLevel !== 'not_verified' && (
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <icons.CheckCircle className="w-3.5 h-3.5" />
                      Verified Real Estate Agent
                    </span>
                  )}
                </div>

                {agent.agentType === 'agency' && agent.agencyName && (
                  <p className="text-sm font-bold text-[#004063] mb-3">
                    Principal Partner at <span className="text-[#029bba]">{agent.agencyName}</span>
                  </p>
                )}

                {agent.tagline && (
                  <p className="text-xs font-semibold text-gray-400 italic mb-4">
                    &ldquo;{agent.tagline}&rdquo;
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1">
                    <icons.MapPin className="w-4 h-4 text-[#029bba]" />
                    {agent.city}, Pakistan
                  </span>
                  <span className="flex items-center gap-1 border-l border-gray-200 pl-4">
                    <icons.Briefcase className="w-4 h-4 text-[#029bba]" />
                    {agent.experience?.years ?? 0}+ Years Active Practice
                  </span>
                </div>
              </div>

            </div>

            {/* Quick Agent Stats */}
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Active Listings" value={agent.stats?.activeListings ?? 0} color="text-[#029bba]" bg="bg-blue-50/50" />
              <StatCard label="Sold/Rented" value={(agent.stats?.soldProperties ?? 0) + (agent.stats?.rentedProperties ?? 0)} color="text-emerald-600" bg="bg-emerald-50/50" />
              <StatCard label="Response SLA" value={agent.stats?.responseRate ? `${agent.stats.responseRate}%` : 'SLA Standard'} color="text-[#7c3aed]" bg="bg-purple-50/50" />
              <StatCard label="Verified Reviews" value={agent.ratings?.totalReviews ?? 0} color="text-amber-600" bg="bg-amber-50/50" />
            </div>
          </div>
        </div>

        {/* Two Column Layout Block */}
        <div className={containers.detail}>
          <div className={grids.detailTwoCol}>

            {/* LEFT COLUMN: Content */}
            <div className="space-y-6 min-w-0">

              {/* About Section */}
              {agent.about && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                  <h2 className={typography.sectionTitlePlain}>About the Consultant</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{agent.about}</p>
                </div>
              )}

              {/* Specializations & Service Areas */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                {(agent.specializations?.length ?? 0) > 0 && (
                  <div>
                    <SectionLabel>Domain Focus &amp; Specializations</SectionLabel>
                    <ColorChipList items={agent.specializations!} />
                  </div>
                )}

                {(agent.serviceAreas?.localities?.length ?? 0) > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <SectionLabel>Localities Covered</SectionLabel>
                    <ChipList items={agent.serviceAreas!.localities!} />
                  </div>
                )}

                {(agent.languages?.length ?? 0) > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <SectionLabel>Languages Spoken</SectionLabel>
                    <ChipList items={agent.languages!} />
                  </div>
                )}
              </div>

              {/* Verified Office & Work Hours */}
              {agent.officeVerification?.address && (
                <OfficeLocationCard
                  address={agent.officeVerification.address}
                  city={agent.officeVerification.city ?? agent.city}
                  coordinates={agent.officeVerification.coordinates}
                  agentName={agent.displayName}
                  onCopySuccess={setAddressCopied}
                  addressCopied={addressCopied}
                />
              )}

              {/* Properties Portfolio Grid */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={typography.sectionTitlePlain}>Exclusive Inventory</h2>
                    <p className={typography.caption}>Listings held by {agent.displayName}</p>
                  </div>

                  {/* Property Category tab navigation */}
                  <div className="flex flex-wrap gap-1 bg-gray-100 border border-gray-200 p-1 rounded-xl self-start sm:self-auto">
                    {PROPERTY_CATEGORIES.map((cat) => {
                      const count = categoryCounts[cat.key];
                      const isActive = activePropertyCategory === cat.key;
                      const isDisabled = count === 0 && cat.key !== 'all';
                      if (isDisabled) return null;

                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setActivePropertyCategory(cat.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-white text-[#004063] shadow-xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {cat.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredProperties.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredProperties.map((property) => (
                      <PropertyCard key={property._id} property={property} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <icons.Home className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-gray-800">No Inventory Found</h3>
                    <p className="text-xs text-gray-400 mt-1">No property listings under this filter at this time.</p>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Standardized 3-Card Stack */}
            <div className="relative min-w-0 w-full max-w-[340px] justify-self-end">
              <div className="space-y-6 w-full">
                <UniversalContactCard
                  entityType="property"
                  entityId={agent._id}
                  entityTitle={agent.displayName}
                  actorName={agent.displayName}
                  actorRole={agent.agencyName || 'Verified Real Estate Agent'}
                  actorImage={profilePhotoUrl || agent.agencyLogo?.url || null}
                  brandLogo="/images/logo.png"
                  isVerified={agent.verificationLevel !== 'not_verified'}
                  initialPhone={agent.phone}
                  initialWhatsapp={agent.whatsapp}
                />

                <SafeDealSidebarCard />

                <SafetyWarningCard onReport={() => setShowReportModal(true)} />

                {/* Insight Card placed at bottom of sidebar stack */}
                <InsightCard agent={agent} />
              </div>
            </div>

          </div>
        </div>

        {/* ── Verified Reviews slider ────────────────────────────────────── */}
        {agent.reviews && agent.reviews.length > 0 && (
          <>
            <style dangerouslySetInnerHTML={{ __html: SWIPER_CUSTOM_STYLES }} />
            <div className="max-w-[1120px] mx-auto px-4 sm:px-6 mt-12 pb-16">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
                  <icons.CheckCircle className="w-3.5 h-3.5" />
                  Verified Reviews
                </span>
                <h2 className="text-2xl font-black text-gray-900">What Clients Say About {agent.displayName.split(' ')[0]}</h2>
              </div>

              <Swiper
                modules={[Autoplay, Navigation, Pagination, Keyboard]}
                className="highrise-review-swiper"
                spaceBetween={24}
                slidesPerView={1}
                breakpoints={{
                  640: { slidesPerView: 1 },
                  768: { slidesPerView: 2 },
                  1024: { slidesPerView: Math.min(3, agent.reviews.length) },
                }}
                pagination={{ clickable: true, dynamicBullets: true }}
                keyboard={{ enabled: true }}
                autoplay={{ delay: 6000, disableOnInteraction: false }}
                loop={agent.reviews.length > 3}
                grabCursor={true}
              >
                {agent.reviews.map((review) => (
                  <SwiperSlide key={review._id ?? review.addedAt}>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-full min-h-[220px]">
                      <div>
                        <div className="flex items-center gap-0.5 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <icons.Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed italic line-clamp-4">
                          &ldquo;{review.reviewText}&rdquo;
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{review.reviewerName}</p>
                          {review.reviewerCity && <p className="text-[10px] text-gray-400">{review.reviewerCity}</p>}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase">
                          <icons.ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </>
        )}

        {/* Safety Disclaimer Banner */}
        <div className={safety.disclaimer}>
          <div className={safety.disclaimerInner}>
            <icons.Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className={safety.disclaimerText}>
              <strong className="text-amber-800">Legal Disclaimer:</strong>{' '}
              Agent identity records and corporate affiliations are verified against governmental registration databases. Highrise.pk strongly recommends physical site visits and document checks before executing agreements or submitting deposits.
            </p>
          </div>
        </div>

      </div>

      <ShareMenu
        agent={{
          slug: agent.slug,
          displayName: agent.displayName,
          agencyName: agent.agencyName,
          city: agent.city,
          image: agent.documents?.profilePhoto?.url || agent.agencyLogo?.url,
        }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <ReportListingModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        propertyId={agent._id}
        reporterUserId=""
        reporterEmail=""
        reporterPhone=""
      />
    </>
  );
}

// ============================================================================
// DATA FETCHING (ISR)
// ============================================================================

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const slug = context.params?.slug;
  if (typeof slug !== 'string') return { notFound: true };

  try {
    await dbConnect();

    const { default: AgentProfile } = await import('@/models/AgentProfile');
    const { default: User } = await import('@/models/User');

    const agentDoc = await AgentProfile.findOne({
      slug,
      status: 'approved',
    })
      .select('+phoneEncrypted +whatsappEncrypted')
      .lean<Record<string, unknown>>();

    if (!agentDoc) return { notFound: true };

    const userId = agentDoc.user as unknown;
    const userDoc =
      typeof userId === 'string' || (userId && typeof userId === 'object')
        ? await User.findById(userId)
            .select('name email')
            .lean<{ name?: string; email?: string }>()
        : null;

    let realPhone: string | undefined;
    let realWhatsapp: string | undefined;

    try {
      const { decryptPhone } = await import('@/lib/kycCrypto');
      if (agentDoc.phoneEncrypted) {
        realPhone = decryptPhone(String(agentDoc.phoneEncrypted));
      }
      if (agentDoc.whatsappEncrypted) {
        realWhatsapp = decryptPhone(String(agentDoc.whatsappEncrypted));
      }
    } catch {
      // Decrypt failed
    }

    const businessEmail = agentDoc.contactEmail
      ? String(agentDoc.contactEmail)
      : userDoc?.email
      ? String(userDoc.email)
      : undefined;

    const docsRaw = agentDoc.documents as
      | { profilePhoto?: { url?: string }; coverPhoto?: { url?: string } }
      | undefined;

    const agencyLogoRaw = agentDoc.agencyLogo as { url?: string } | undefined;

    const agent: PublicAgent = {
      _id: String(agentDoc._id),
      slug: String(agentDoc.slug ?? ''),
      displayName: String(agentDoc.displayName ?? userDoc?.name ?? 'Agent'),
      tagline: agentDoc.tagline ? String(agentDoc.tagline) : undefined,
      about: agentDoc.about ? String(agentDoc.about) : undefined,
      agentType: (agentDoc.agentType as PublicAgent['agentType']) ?? 'individual',
      agencyName: agentDoc.agencyName ? String(agentDoc.agencyName) : undefined,
      city: String(agentDoc.city ?? 'Pakistan'),
      phone: realPhone,
      email: businessEmail,
      whatsapp: realWhatsapp,
      officeVerification: agentDoc.officeVerification
        ? (() => {
            const ov = agentDoc.officeVerification as Record<string, unknown>;
            const coords = ov.coordinates as { latitude?: unknown; longitude?: unknown } | undefined;
            const lat = Number(coords?.latitude);
            const lng = Number(coords?.longitude);
            const hasValidCoords =
              Number.isFinite(lat) &&
              Number.isFinite(lng) &&
              lat >= -90 && lat <= 90 &&
              lng >= -180 && lng <= 180 &&
              !(lat === 0 && lng === 0);

            return {
              address: ov.address ? String(ov.address) : undefined,
              city: ov.city ? String(ov.city) : undefined,
              coordinates: hasValidCoords ? { latitude: lat, longitude: lng } : undefined,
            };
          })()
        : undefined,
      experience: agentDoc.experience as PublicAgent['experience'],
      serviceAreas: agentDoc.serviceAreas as PublicAgent['serviceAreas'],
      specializations: Array.isArray(agentDoc.specializations) ? (agentDoc.specializations as string[]) : [],
      languages: Array.isArray(agentDoc.languages) ? (agentDoc.languages as string[]) : [],
      socialLinks: agentDoc.socialLinks as PublicAgent['socialLinks'],
      businessHours: agentDoc.businessHours as PublicAgent['businessHours'],
      documents: {
        profilePhoto: docsRaw?.profilePhoto?.url ? { url: String(docsRaw.profilePhoto.url) } : undefined,
        coverPhoto: docsRaw?.coverPhoto?.url ? { url: String(docsRaw.coverPhoto.url) } : undefined,
      },
      agencyLogo: agencyLogoRaw?.url ? { url: String(agencyLogoRaw.url) } : undefined,
      verificationLevel: (agentDoc.verificationLevel as PublicAgent['verificationLevel']) ?? 'not_verified',
      stats: agentDoc.stats as PublicAgent['stats'],
      ratings: agentDoc.ratings as PublicAgent['ratings'],
      createdAt: agentDoc.createdAt ? new Date(agentDoc.createdAt as string).toISOString() : undefined,
      reviews: Array.isArray(agentDoc.reviews)
        ? (agentDoc.reviews as Array<Record<string, unknown>>)
            .filter((r) => r.isPublished === true)
            .sort((a, b) => {
              const dateA = new Date(String(a.addedAt ?? 0)).getTime();
              const dateB = new Date(String(b.addedAt ?? 0)).getTime();
              return dateB - dateA;
            })
            .slice(0, 20)
            .map((r) => ({
              _id: r._id ? String(r._id) : undefined,
              rating: Number(r.rating ?? 0),
              reviewText: String(r.reviewText ?? ''),
              reviewerName: String(r.reviewerName ?? 'Verified Client'),
              reviewerCity: r.reviewerCity ? String(r.reviewerCity) : undefined,
              source: String(r.source ?? 'admin_verified'),
              addedAt: new Date(String(r.addedAt)).toISOString(),
            }))
        : [],
    };

    let properties: PublicProperty[] = [];
    try {
      const { default: Property } = await import('@/models/Property');
      const propDocs = await Property.find({
        owner: agentDoc.user,
        status: 'approved',
      })
        .select('title slug price totalPrice area unit city locality society propertyType listingType bedrooms bathrooms images')
        .limit(12)
        .lean<PublicProperty[]>();

      properties = propDocs.map((p) => ({
        ...p,
        _id: String(p._id),
      }));
    } catch {
      properties = [];
    }

    const cleanAgent = serializeForNext(agent);
    const cleanProperties = serializeForNext(properties);

    return {
      props: {
        agent: cleanAgent,
        properties: cleanProperties,
      },
      revalidate: 60,
    };
  } catch {
    return { notFound: true };
  }
};