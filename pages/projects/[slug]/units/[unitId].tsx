// pages/projects/[slug]/units/[unitId].tsx

import React, { useState, useEffect } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';
import {
  ArrowLeft,
  ChevronRight,
  Home,
  MapPin,
  Building2,
  CheckCircle,
  Clock,
  Ban,
  AlertCircle,
  X,
  Phone,
  MessageCircle,
  PhoneCall,
  Bed,
  Bath,
  Maximize2,
  TrendingUp,
  TrendingDown,
  Shield,
  BadgeCheck,
  Star,
  Tag,
  Layers,
  Calendar,
  Eye,
  Share2,
  Bookmark,
  ExternalLink,
  ChevronLeft,
  Camera,
  Play,
  Download,
  FileText,
  BarChart3,
  Percent,
  DollarSign,
  Target,
  Zap,
  Award,
  Info,
  Lock,
  ArrowRight,
  Compass,
  Wind,
  Car,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UnitImage {
  url: string;
  caption?: string;
}

interface PriceHistoryEntry {
  price: number;
  changedAt: string;
  changedBy?: string;
  reason?: string;
}

interface ProjectInfo {
  _id: string;
  slug: string;
  projectName: string;
  city: string;
  areaName: string;
  featureImageUrl?: string;
  developerBadge?: string;
  badge?: string;
  isVerified?: boolean;
  developer?: string;
  developerProfile?: {
    companyName?: string;
    logoUrl?: string;
    contactNumber?: string;
    whatsappNumber?: string;
  };
}

interface UnitDetail {
  _id: string;
  unitNumber: string;
  floorNumber: number;
  floorName?: string;
  unitType: string;
  listingType: 'full_payment' | 'installment' | 'both' | 'pre_launch';
  status: 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';

  // Pricing
  price: number;
  pricePerSqft?: number;
  priceHistory?: PriceHistoryEntry[];

  // Installment
  installmentAvailable?: boolean;
  bookingAmount?: number;
  bookingPercentage?: number;
  monthlyInstallment?: number;
  installmentDuration?: number;
  installmentFrequency?: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  downPayment?: number;
  downPaymentPercentage?: number;
  onPossessionAmount?: number;
  onPossessionPercentage?: number;

  // Area
  areaSqft?: number;
  areaMarla?: number;
  coveredAreaSqft?: number;

  // Specs
  bedrooms?: number;
  bathrooms?: number;
  facing?: string;
  view?: string;
  parkingSpots?: number;

  // Media
  images?: UnitImage[];
  floorPlanImageUrl?: string;
  floorPlanPdfUrl?: string;

  // Features
  features?: string[];
  utilities?: string[];
  customFields?: { key: string; value: string }[];

  // Investor Intelligence
  expectedRentalYield?: number;
  estimatedMonthlyRent?: number;
  capitalAppreciation?: number;
  investmentScore?: number;
  demandScore?: number;

  // Reservation
  reservedUntil?: string;

  // Denormalized project info
  project: string | ProjectInfo;
  projectSlug?: string;
  projectName?: string;
  city?: string;
  areaName?: string;
  developerBadge?: string;
  contactVisibility?: 'highrise_only' | 'developer_office' | 'full';

  // Meta
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PageProps {
  unit: UnitDetail;
  project: ProjectInfo;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: React.ReactElement;
  description: string;
}> = {
  available: {
    label: 'Available',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    icon: <CheckCircle className="w-4 h-4" />,
    description: 'This unit is available for booking.',
  },
  reserved: {
    label: 'Reserved',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: <Clock className="w-4 h-4" />,
    description: 'This unit is currently reserved.',
  },
  sold: {
    label: 'Sold',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: <Ban className="w-4 h-4" />,
    description: 'This unit has been sold.',
  },
  on_hold: {
    label: 'On Hold',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    dot: 'bg-gray-400',
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'This unit is temporarily on hold.',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    border: 'border-gray-200',
    dot: 'bg-gray-300',
    icon: <X className="w-4 h-4" />,
    description: 'This unit listing has been cancelled.',
  },
};

const LISTING_TYPE_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  description: string;
}> = {
  full_payment: {
    label: 'Full Payment',
    bg: 'bg-[#029bba]/10',
    text: 'text-[#029bba]',
    border: 'border-[#029bba]/20',
    description: 'One-time full payment required.',
  },
  installment: {
    label: 'Installment Plan',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    description: 'Flexible installment payment available.',
  },
  both: {
    label: 'Full or Installment',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    description: 'Choose full payment or installment plan.',
  },
  pre_launch: {
    label: 'Pre-Launch',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    description: 'Pre-launch pricing — limited availability.',
  },
};

const BADGE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  new_entrant: { label: 'New Entrant',  color: 'text-gray-500',   icon: '🆕' },
  emerging:    { label: 'Emerging',     color: 'text-blue-600',   icon: '⭐' },
  trusted:     { label: 'Trusted',      color: 'text-[#029bba]',  icon: '🏆' },
  premium:     { label: 'Premium',      color: 'text-purple-600', icon: '💎' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  monthly:   'month',
  quarterly: 'quarter',
  biannual:  'half year',
  annual:    'year',
};

// ============================================
// HELPERS
// ============================================

function formatPrice(price: number): string {
  if (!price) return 'Contact for Price';
  if (price >= 10_000_000) {
    const c = price / 10_000_000;
    return `PKR ${c % 1 === 0 ? c.toFixed(0) : c.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const l = price / 100_000;
    return `PKR ${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} Lac`;
  }
  return `PKR ${price.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function getInvestmentScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-[#029bba]';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getInvestmentScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Below Average';
}

function getUnitTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartment', shop: 'Shop', office: 'Office',
    parking: 'Parking', penthouse: 'Penthouse', foodcourt: 'Food Court',
    studio: 'Studio', duplex: 'Duplex', warehouse: 'Warehouse',
  };
  return labels[type?.toLowerCase()] ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unit');
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Image Gallery Modal
function GalleryModal({
  isOpen, onClose, images, initialIndex, unitNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  images: UnitImage[];
  initialIndex: number;
  unitNumber: string;
}): React.ReactElement | null {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => { setCurrent(initialIndex); }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(p => (p > 0 ? p - 1 : images.length - 1));
      if (e.key === 'ArrowRight') setCurrent(p => (p < images.length - 1 ? p + 1 : 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="text-white">
          <p className="font-semibold">Unit {unitNumber}</p>
          <p className="text-sm text-gray-400">{current + 1} of {images.length}</p>
        </div>
        <button onClick={onClose} aria-label="Close gallery"
          className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-16">
        <button
          onClick={() => setCurrent(p => (p > 0 ? p - 1 : images.length - 1))}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="relative w-full h-full max-w-5xl max-h-[70vh]">
          <Image
            src={images[current].url}
            alt={images[current].caption || `Unit ${unitNumber} — Photo ${current + 1}`}
            fill className="object-contain"
          />
        </div>
        <button
          onClick={() => setCurrent(p => (p < images.length - 1 ? p + 1 : 0))}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
      {images[current].caption && (
        <p className="text-center text-white/60 text-sm py-2">{images[current].caption}</p>
      )}
      <div className="py-4 px-4 bg-black/60">
        <div className="flex gap-2 justify-center overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === current ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'
              }`}>
              <Image src={img.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Inline banner
function Banner({
  type, message,
}: {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}): React.ReactElement {
  const styles = {
    success: 'bg-[#f0fdf4] border-l-4 border-[#10b981] text-[#10b981]',
    error:   'bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700',
    info:    'bg-[#eff6ff] border-l-4 border-[#029bba] text-[#004063]',
    warning: 'bg-[#fef3c7] border-l-4 border-[#f59e0b] text-amber-800',
  };
  return (
    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${styles[type]}`}>
      {message}
    </div>
  );
}

// Spec pill
function SpecPill({
  icon, label, value,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 flex items-center justify-center text-[#029bba] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">{label}</p>
        <p className="font-bold text-gray-900 text-sm">{value}</p>
      </div>
    </div>
  );
}

// Investor metric card
function InvestorCard({
  icon, label, value, sub, color = 'text-[#029bba]',
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center text-[#029bba]">
          {icon}
        </div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function UnitDetailPage({ unit, project }: PageProps): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Gallery
  const [galleryOpen, setGalleryOpen]   = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Modals
  const [showInquiry, setShowInquiry]   = useState(false);
  const [inquiryType, setInquiryType]   = useState<
    'project_interest' | 'call_back' | 'site_visit' | 'general_inquiry'
  >('project_interest');

  // Contact reveal
  const [revealedContact, setRevealedContact] = useState<'call' | 'whatsapp' | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptType, setLoginPromptType] = useState<'call' | 'whatsapp'>('call');

  // UI
  const [isBookmarked, setIsBookmarked]   = useState(false);
  const [bookmarkBanner, setBookmarkBanner] = useState('');
  const [copyBanner, setCopyBanner]         = useState('');
  const [activeImageTab, setActiveImageTab] = useState<'photos' | 'floorplan'>('photos');

  // Derived
  const images   = unit.images ?? [];
  const hasImages = images.length > 0;
  const primaryImage = images[0]?.url ?? project.featureImageUrl ?? '';
  const status   = STATUS_CONFIG[unit.status] ?? STATUS_CONFIG.available;
  const listing  = LISTING_TYPE_CONFIG[unit.listingType] ?? LISTING_TYPE_CONFIG.full_payment;
  const badge    = unit.developerBadge ?? project.badge ?? project.developerBadge;
  const badgeCfg = badge ? BADGE_CONFIG[badge] : null;
  const isAvailable = unit.status === 'available';
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
  const canonicalUrl = `${siteUrl}/projects/${project.slug}/units/${unit._id}`;

  const hasInvestorData =
    unit.expectedRentalYield !== undefined ||
    unit.estimatedMonthlyRent !== undefined ||
    unit.capitalAppreciation !== undefined ||
    unit.investmentScore !== undefined;

  const hasInstallment =
    unit.listingType === 'installment' ||
    unit.listingType === 'both' ||
    unit.installmentAvailable;

  // Check bookmark
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bookmarkedUnits') || '[]') as string[];
      setIsBookmarked(saved.includes(unit._id));
    } catch { setIsBookmarked(false); }
  }, [unit._id]);

  // Handlers
  function openGallery(idx: number) { setGalleryIndex(idx); setGalleryOpen(true); }

  function handleBookmark() {
    try {
      const saved = JSON.parse(localStorage.getItem('bookmarkedUnits') || '[]') as string[];
      if (!isBookmarked) {
        localStorage.setItem('bookmarkedUnits', JSON.stringify([...saved.filter(id => id !== unit._id), unit._id]));
        setIsBookmarked(true);
        setBookmarkBanner('Unit saved to bookmarks.');
      } else {
        localStorage.setItem('bookmarkedUnits', JSON.stringify(saved.filter(id => id !== unit._id)));
        setIsBookmarked(false);
        setBookmarkBanner('Unit removed from bookmarks.');
      }
      setTimeout(() => setBookmarkBanner(''), 3000);
    } catch { setIsBookmarked(false); }
  }

  async function handleShare() {
    const url   = typeof window !== 'undefined' ? window.location.href : canonicalUrl;
    const title = `Unit ${unit.unitNumber} — ${project.projectName}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await (navigator as Navigator).share({ title, url }); } catch { /* cancelled */ }
    } else {
      try {
        await (navigator as Navigator).clipboard.writeText(url);
        setCopyBanner('Link copied to clipboard!');
        setTimeout(() => setCopyBanner(''), 3000);
      } catch {
        setCopyBanner('Could not copy link.');
        setTimeout(() => setCopyBanner(''), 3000);
      }
    }
  }

  function handleContactReveal(type: 'call' | 'whatsapp') {
    if (!isLoggedIn) {
      setLoginPromptType(type);
      setShowLoginPrompt(true);
      return;
    }
    if (revealedContact === type) {
      const phone =
        type === 'whatsapp'
          ? (project.developerProfile?.whatsappNumber || project.developerProfile?.contactNumber)
          : project.developerProfile?.contactNumber;
      if (!phone) { setInquiryType('call_back'); setShowInquiry(true); return; }
      if (type === 'call') {
        window.open(`tel:${phone}`, '_self');
      } else {
        const clean = phone.replace(/\D/g, '');
        const msg = encodeURIComponent(`Hi, I'm interested in Unit ${unit.unitNumber} at ${project.projectName} on Highrise.pk`);
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
      }
      return;
    }
    setRevealedContact(type);
  }

  function maskPhone(phone?: string): string {
    if (!phone) return '****-*******';
    const c = phone.replace(/\D/g, '');
    if (c.length >= 10) return `${c.slice(0, 4)}-***-**${c.slice(-2)}`;
    return '****-*******';
  }

  // Fallback
  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#029bba] mx-auto" />
          <p className="mt-4 text-gray-500">Loading unit...</p>
        </div>
      </div>
    );
  }

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: `Unit ${unit.unitNumber} — ${project.projectName}`,
    description: `${getUnitTypeLabel(unit.unitType)} on Floor ${unit.floorNumber} at ${project.projectName}, ${project.areaName}, ${project.city}.`,
    url: canonicalUrl,
    image: primaryImage ? [primaryImage] : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: project.areaName,
      addressRegion: project.city,
      addressCountry: 'PK',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: unit.price || undefined,
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    numberOfRooms: unit.bedrooms,
    floorSize: unit.areaSqft ? {
      '@type': 'QuantitativeValue',
      value: unit.areaSqft,
      unitCode: 'FTK',
    } : undefined,
    seller: {
      '@type': 'Organization',
      name: project.developerProfile?.companyName || 'Developer',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{`Unit ${unit.unitNumber} — ${project.projectName} | ${project.city} | Highrise.pk`}</title>
        <meta name="description" content={
          `${getUnitTypeLabel(unit.unitType)} Unit ${unit.unitNumber} on Floor ${unit.floorNumber} at ${project.projectName}, ${project.areaName}, ${project.city}. ${formatPrice(unit.price)}.`
        } />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="Highrise.pk" />
        <meta property="og:title"       content={`Unit ${unit.unitNumber} — ${project.projectName} | Highrise.pk`} />
        <meta property="og:description" content={`${getUnitTypeLabel(unit.unitType)} | Floor ${unit.floorNumber} | ${formatPrice(unit.price)}`} />
        <meta property="og:url"         content={canonicalUrl} />
        {primaryImage && <meta property="og:image" content={primaryImage} />}
        <meta name="twitter:card"  content="summary_large_image" />
        <meta name="twitter:title" content={`Unit ${unit.unitNumber} — ${project.projectName}`} />
        {primaryImage && <meta name="twitter:image" content={primaryImage} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </Head>

      {/* Inline banners */}
      {(bookmarkBanner || copyBanner) && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs w-full">
          {bookmarkBanner && <Banner type="success" message={bookmarkBanner} />}
          {copyBanner     && <Banner type="info"    message={copyBanner} />}
        </div>
      )}

      {/* ═══════════ BREADCRUMB ═══════════ */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <Link href="/" className="flex items-center gap-1 text-gray-500 hover:text-[#029bba] transition-colors">
              <Home className="w-3.5 h-3.5" />Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/projects" className="text-gray-500 hover:text-[#029bba] transition-colors">Projects</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href={`/projects/${project.slug}`} className="text-gray-500 hover:text-[#029bba] transition-colors truncate max-w-[120px]">
              {project.projectName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href={`/projects/${project.slug}/units`} className="text-gray-500 hover:text-[#029bba] transition-colors">
              Units
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-900 font-semibold">Unit {unit.unitNumber}</span>
          </nav>
        </div>
      </div>

      {/* ═══════════ HERO ═══════════ */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        {/* BG effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#029bba]/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/15 rounded-full blur-[80px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          {/* Top bar — back + actions */}
          <div className="flex items-center justify-between mb-6">
            <Link href={`/projects/${project.slug}/units`}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Units</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={handleShare}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                title="Share">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={handleBookmark}
                className={`p-2 rounded-xl transition-all border ${
                  isBookmarked
                    ? 'bg-[#029bba] text-white border-[#029bba]'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
                }`} title={isBookmarked ? 'Saved' : 'Save'}>
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Main hero grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">

            {/* LEFT — image gallery */}
            <div className="lg:col-span-2 space-y-3">

              {/* Image tabs */}
              {(hasImages || unit.floorPlanImageUrl) && (
                <div className="flex gap-2">
                  {hasImages && (
                    <button onClick={() => setActiveImageTab('photos')}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        activeImageTab === 'photos'
                          ? 'bg-white text-slate-900'
                          : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                      }`}>
                      <Camera className="w-3.5 h-3.5 inline mr-1.5" />{images.length} Photos
                    </button>
                  )}
                  {unit.floorPlanImageUrl && (
                    <button onClick={() => setActiveImageTab('floorplan')}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        activeImageTab === 'floorplan'
                          ? 'bg-white text-slate-900'
                          : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                      }`}>
                      <Layers className="w-3.5 h-3.5 inline mr-1.5" />Floor Plan
                    </button>
                  )}
                </div>
              )}

              {/* Main image */}
              <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[280px] md:h-[380px]">
                {/* Primary */}
                <div
                  className="col-span-3 row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl bg-slate-800"
                  onClick={() => {
                    if (activeImageTab === 'floorplan' && unit.floorPlanImageUrl) return;
                    if (hasImages) openGallery(0);
                  }}
                >
                  {activeImageTab === 'floorplan' && unit.floorPlanImageUrl ? (
                    <Image src={unit.floorPlanImageUrl} alt="Floor Plan" fill className="object-contain p-4" />
                  ) : primaryImage ? (
                    <>
                      <Image src={primaryImage} alt={`Unit ${unit.unitNumber}`} fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {hasImages && (
                        <div className="absolute inset-0 flex items-end justify-start p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-medium">
                            <Camera className="w-3.5 h-3.5" />View All {images.length} Photos
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-slate-600" />
                    </div>
                  )}

                  {/* Status overlay badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${status.bg} ${status.text} ${status.border}`}>
                      <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>

                  {/* Listing type */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-sm ${listing.bg} ${listing.text} ${listing.border}`}>
                      {listing.label}
                    </span>
                  </div>

                  {/* Floor badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
                      {unit.floorName ?? `Floor ${unit.floorNumber}`}
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="col-span-1 row-span-2 grid grid-rows-3 gap-3">
                  {[1, 2].map(idx => (
                    <div key={idx}
                      className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-800 shadow-lg"
                      onClick={() => images[idx] && openGallery(idx)}>
                      {images[idx] ? (
                        <>
                          <Image src={images[idx].url} alt={`Photo ${idx + 1}`}
                            fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* View all */}
                  <div className="relative rounded-xl overflow-hidden cursor-pointer group shadow-lg"
                    onClick={() => hasImages && openGallery(0)}>
                    {images[3] && (
                      <Image src={images[3].url} alt="More" fill className="object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#029bba] to-[#017a8a] opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <Camera className="w-4 h-4 mb-1" />
                      <span className="text-lg font-black">+{Math.max(0, images.length - 3)}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-80">More</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — price + contact card */}
            <div className="lg:col-span-1">
              <div className="relative bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#029bba]/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="relative p-6 space-y-5">

                  {/* Unit identity */}
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">
                      {getUnitTypeLabel(unit.unitType)}
                    </p>
                    <h1 className="text-2xl font-black text-white">Unit {unit.unitNumber}</h1>
                    <p className="text-white/50 text-sm mt-1">
                      {unit.floorName ?? `Floor ${unit.floorNumber}`} • {project.projectName}
                    </p>
                  </div>

                  <div className="h-px bg-white/10" />

                  {/* Price */}
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">Price</p>
                    <p className="text-3xl font-black text-white">{formatPrice(unit.price)}</p>
                    {unit.pricePerSqft && unit.areaSqft && (
                      <p className="text-white/40 text-xs mt-1">
                        PKR {unit.pricePerSqft.toLocaleString()} / sqft
                      </p>
                    )}
                  </div>

                  {/* Quick specs */}
                  <div className="grid grid-cols-3 gap-2">
                    {unit.areaSqft && (
                      <div className="text-center p-2 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-sm font-bold text-white">{unit.areaSqft.toLocaleString()}</p>
                        <p className="text-[9px] text-white/40 uppercase mt-0.5">Sq Ft</p>
                      </div>
                    )}
                    {(unit.bedrooms ?? 0) > 0 && (
                      <div className="text-center p-2 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-sm font-bold text-white">{unit.bedrooms}</p>
                        <p className="text-[9px] text-white/40 uppercase mt-0.5">Beds</p>
                      </div>
                    )}
                    {(unit.bathrooms ?? 0) > 0 && (
                      <div className="text-center p-2 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-sm font-bold text-white">{unit.bathrooms}</p>
                        <p className="text-[9px] text-white/40 uppercase mt-0.5">Baths</p>
                      </div>
                    )}
                  </div>

                  {/* Developer badge */}
                  {badgeCfg && (
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-lg">{badgeCfg.icon}</span>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wide">Developer Badge</p>
                        <p className={`text-sm font-bold ${badgeCfg.color}`}>{badgeCfg.label}</p>
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-white/10" />

                  {/* CTA buttons */}
                  <div className="space-y-2.5">
                    {isAvailable ? (
                      <>
                        {/* Book Now */}
                        <button
                          onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                          className="w-full bg-gradient-to-r from-[#029bba] to-[#017a8a] hover:from-[#02a8c9] hover:to-[#018a9a] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#029bba]/20 flex items-center justify-center gap-2">
                          <Star className="w-5 h-5" />Book This Unit
                        </button>

                        {/* Call */}
                        <button onClick={() => handleContactReveal('call')}
                          className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" />
                          {revealedContact === 'call'
                            ? `Tap again: ${project.developerProfile?.contactNumber}`
                            : `Call — ${maskPhone(project.developerProfile?.contactNumber)}`}
                        </button>

                        {/* WhatsApp */}
                        <button onClick={() => handleContactReveal('whatsapp')}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          {revealedContact === 'whatsapp'
                            ? `Tap again: ${project.developerProfile?.whatsappNumber || project.developerProfile?.contactNumber}`
                            : 'WhatsApp'}
                        </button>

                        {/* Callback */}
                        <button onClick={() => { setInquiryType('call_back'); setShowInquiry(true); }}
                          className="w-full bg-transparent text-white/60 hover:text-white font-medium py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                          <PhoneCall className="w-4 h-4" />Request Callback
                        </button>
                      </>
                    ) : (
                      /* Not available */
                      <>
                        <div className={`w-full py-4 rounded-xl text-center font-bold border ${status.bg} ${status.text} ${status.border}`}>
                          {status.icon}
                          <span className="ml-2">{status.label}</span>
                        </div>
                        <p className="text-white/40 text-xs text-center">{status.description}</p>
                        <button onClick={() => { setInquiryType('general_inquiry'); setShowInquiry(true); }}
                          className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" />Get Notified
                        </button>
                      </>
                    )}
                  </div>

                  {/* Trust note */}
                  <p className="text-center text-white/25 text-[10px]">
                    🔒 {isLoggedIn ? 'Verified contact details' : 'Login to reveal contact'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ STATUS BANNER (if not available) ═══════════ */}
      {!isAvailable && (
        <div className={`border-b ${status.bg} ${status.border}`}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <span className={status.text}>{status.icon}</span>
            <p className={`text-sm font-semibold ${status.text}`}>
              {status.description}
              {unit.status === 'reserved' && unit.reservedUntil && (
                <span className="font-normal ml-2 opacity-70">Reserved until {formatDate(unit.reservedUntil)}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* UNIT SPECS */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#029bba]" />
                  Unit Specifications
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  <SpecPill icon={<Building2 className="w-4 h-4" />} label="Unit Number" value={unit.unitNumber} />
                  <SpecPill icon={<Layers className="w-4 h-4" />} label="Unit Type" value={getUnitTypeLabel(unit.unitType)} />
                  <SpecPill icon={<BarChart3 className="w-4 h-4" />} label="Floor" value={unit.floorName ?? `Floor ${unit.floorNumber}`} />
                  <SpecPill icon={<Tag className="w-4 h-4" />} label="Listing Type" value={listing.label} />
                  {unit.areaSqft && (
                    <SpecPill icon={<Maximize2 className="w-4 h-4" />} label="Area (sqft)" value={`${unit.areaSqft.toLocaleString()} sqft`} />
                  )}
                  {unit.areaMarla && (
                    <SpecPill icon={<Maximize2 className="w-4 h-4" />} label="Area (Marla)" value={`${unit.areaMarla} Marla`} />
                  )}
                  {unit.coveredAreaSqft && (
                    <SpecPill icon={<Maximize2 className="w-4 h-4" />} label="Covered Area" value={`${unit.coveredAreaSqft.toLocaleString()} sqft`} />
                  )}
                  {(unit.bedrooms ?? 0) > 0 && (
                    <SpecPill icon={<Bed className="w-4 h-4" />} label="Bedrooms" value={String(unit.bedrooms)} />
                  )}
                  {(unit.bathrooms ?? 0) > 0 && (
                    <SpecPill icon={<Bath className="w-4 h-4" />} label="Bathrooms" value={String(unit.bathrooms)} />
                  )}
                  {unit.facing && (
                    <SpecPill icon={<Compass className="w-4 h-4" />} label="Facing" value={unit.facing} />
                  )}
                  {unit.view && (
                    <SpecPill icon={<Eye className="w-4 h-4" />} label="View" value={unit.view} />
                  )}
                  {(unit.parkingSpots ?? 0) > 0 && (
                    <SpecPill icon={<Car className="w-4 h-4" />} label="Parking" value={`${unit.parkingSpots} spot${(unit.parkingSpots ?? 0) > 1 ? 's' : ''}`} />
                  )}
                  {unit.pricePerSqft && (
                    <SpecPill icon={<DollarSign className="w-4 h-4" />} label="Price/sqft" value={`PKR ${unit.pricePerSqft.toLocaleString()}`} />
                  )}
                </div>

                {/* Custom fields */}
                {(unit.customFields?.length ?? 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {unit.customFields!.map((cf, i) => (
                      <SpecPill key={i} icon={<Info className="w-4 h-4" />} label={cf.key} value={cf.value} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* INSTALLMENT PLAN */}
            {hasInstallment && (unit.bookingAmount || unit.monthlyInstallment || unit.downPayment) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Installment Breakdown
                  </h2>
                  <span className="text-xs font-semibold px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                    {FREQUENCY_LABELS[unit.installmentFrequency ?? 'monthly']?.toUpperCase() ?? 'MONTHLY'}
                  </span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {unit.bookingAmount && (
                      <div className="bg-[#029bba] text-white rounded-xl p-4 text-center">
                        <p className="text-xs uppercase opacity-80 mb-1">Booking</p>
                        <p className="text-xl font-black">{formatPrice(unit.bookingAmount)}</p>
                        {unit.bookingPercentage && (
                          <p className="text-xs opacity-70 mt-1">{unit.bookingPercentage}%</p>
                        )}
                      </div>
                    )}
                    {unit.downPayment && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                        <p className="text-xs uppercase text-purple-500 mb-1">Down Payment</p>
                        <p className="text-xl font-black text-purple-700">{formatPrice(unit.downPayment)}</p>
                        {unit.downPaymentPercentage && (
                          <p className="text-xs text-purple-400 mt-1">{unit.downPaymentPercentage}%</p>
                        )}
                      </div>
                    )}
                    {unit.monthlyInstallment && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-xs uppercase text-gray-500 mb-1">
                          Per {FREQUENCY_LABELS[unit.installmentFrequency ?? 'monthly'] ?? 'Month'}
                        </p>
                        <p className="text-xl font-black text-gray-900">{formatPrice(unit.monthlyInstallment)}</p>
                        {unit.installmentDuration && (
                          <p className="text-xs text-gray-400 mt-1">× {unit.installmentDuration}</p>
                        )}
                      </div>
                    )}
                    {unit.onPossessionAmount && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-xs uppercase text-green-600 mb-1">On Possession</p>
                        <p className="text-xl font-black text-green-700">{formatPrice(unit.onPossessionAmount)}</p>
                        {unit.onPossessionPercentage && (
                          <p className="text-xs text-green-400 mt-1">{unit.onPossessionPercentage}%</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-gray-600 font-medium">Total Price</span>
                    <span className="text-2xl font-black text-[#029bba]">{formatPrice(unit.price)}</span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                    className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors">
                    Get Detailed Payment Plan
                  </button>
                </div>
              </div>
            )}

            {/* INVESTOR INTELLIGENCE */}
            {hasInvestorData && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Investor Intelligence
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                    <Shield className="w-3 h-3" />By Highrise.pk
                  </span>
                </div>
                <div className="p-6">
                  {/* Investment score hero */}
                  {unit.investmentScore !== undefined && (
                    <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">
                            Investment Score
                          </p>
                          <p className={`text-5xl font-black ${getInvestmentScoreColor(unit.investmentScore)}`}>
                            {unit.investmentScore}
                            <span className="text-2xl text-gray-300">/100</span>
                          </p>
                          <p className={`text-sm font-bold mt-1 ${getInvestmentScoreColor(unit.investmentScore)}`}>
                            {getInvestmentScoreLabel(unit.investmentScore)}
                          </p>
                        </div>
                        <div className="w-20 h-20 relative">
                          {/* Score ring */}
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15.9" fill="none"
                              stroke={unit.investmentScore >= 80 ? '#10b981' : unit.investmentScore >= 60 ? '#029bba' : unit.investmentScore >= 40 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="3"
                              strokeDasharray={`${unit.investmentScore} ${100 - unit.investmentScore}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Award className={`w-6 h-6 ${getInvestmentScoreColor(unit.investmentScore)}`} />
                          </div>
                        </div>
                      </div>
                      {/* Score bar */}
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${unit.investmentScore}%`,
                            background: unit.investmentScore >= 80 ? '#10b981' : unit.investmentScore >= 60 ? '#029bba' : unit.investmentScore >= 40 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metric cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {unit.expectedRentalYield !== undefined && (
                      <InvestorCard
                        icon={<Percent className="w-4 h-4" />}
                        label="Rental Yield"
                        value={`${unit.expectedRentalYield.toFixed(1)}%`}
                        sub="Expected per year"
                        color={unit.expectedRentalYield >= 6 ? 'text-green-600' : 'text-[#029bba]'}
                      />
                    )}
                    {unit.estimatedMonthlyRent !== undefined && (
                      <InvestorCard
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Monthly Rent"
                        value={formatPrice(unit.estimatedMonthlyRent)}
                        sub="Estimated income"
                        color="text-[#029bba]"
                      />
                    )}
                    {unit.capitalAppreciation !== undefined && (
                      <InvestorCard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Appreciation"
                        value={`${unit.capitalAppreciation.toFixed(1)}%`}
                        sub="Expected per year"
                        color={unit.capitalAppreciation >= 10 ? 'text-green-600' : 'text-amber-600'}
                      />
                    )}
                    {unit.demandScore !== undefined && (
                      <InvestorCard
                        icon={<Target className="w-4 h-4" />}
                        label="Demand Score"
                        value={`${unit.demandScore}/100`}
                        sub="Market demand"
                        color={unit.demandScore >= 70 ? 'text-green-600' : 'text-[#029bba]'}
                      />
                    )}
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Investment metrics are estimates based on market data. Past performance does not guarantee future results. Always conduct your own due diligence.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FEATURES & UTILITIES */}
            {((unit.features?.length ?? 0) > 0 || (unit.utilities?.length ?? 0) > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#029bba]" />
                    Features & Utilities
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  {(unit.features?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Features</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unit.features!.map((f, i) => (
                          <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-[#029bba] flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(unit.utilities?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Utilities</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unit.utilities!.map((u, i) => (
                          <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{u}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FLOOR PLAN */}
            {(unit.floorPlanImageUrl || unit.floorPlanPdfUrl) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#029bba]" />
                    Floor Plan
                  </h2>
                </div>
                <div className="p-6">
                  {unit.floorPlanImageUrl && (
                    <div className="relative w-full h-64 md:h-96 mb-4 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                      <Image src={unit.floorPlanImageUrl} alt="Floor Plan" fill className="object-contain p-4" />
                    </div>
                  )}
                  {unit.floorPlanPdfUrl && (
                    <a href={unit.floorPlanPdfUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors">
                      <Download className="w-5 h-5" />Download Floor Plan PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* PRICE HISTORY */}
            {(unit.priceHistory?.length ?? 0) > 1 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#029bba]" />
                    Price History
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[...(unit.priceHistory ?? [])]
                      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                      .map((entry, idx, arr) => {
                        const prev = arr[idx + 1];
                        const diff = prev ? entry.price - prev.price : 0;
                        const isUp = diff > 0;
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                idx === 0 ? 'bg-[#029bba]/10' : isUp ? 'bg-red-50' : 'bg-green-50'
                              }`}>
                                {idx === 0
                                  ? <Tag className="w-4 h-4 text-[#029bba]" />
                                  : isUp
                                  ? <TrendingUp className="w-4 h-4 text-red-500" />
                                  : <TrendingDown className="w-4 h-4 text-green-500" />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{formatPrice(entry.price)}</p>
                                <p className="text-xs text-gray-400">{formatDate(entry.changedAt)}</p>
                              </div>
                            </div>
                            {prev && diff !== 0 && (
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                isUp ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                              }`}>
                                {isUp ? '+' : ''}{formatPrice(Math.abs(diff))}
                              </span>
                            )}
                            {idx === 0 && (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#029bba]/10 text-[#029bba]">
                                Current
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* BACK TO PROJECT */}
            <div className="bg-gradient-to-br from-[#001f2b] to-[#004063] rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4">
                {project.featureImageUrl && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={project.featureImageUrl} alt={project.projectName} fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Part of</p>
                  <h3 className="font-black text-lg truncate">{project.projectName}</h3>
                  <p className="text-white/50 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{project.areaName}, {project.city}
                  </p>
                </div>
                <Link href={`/projects/${project.slug}`}
                  className="flex-shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
                  View Project <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
                <Link href={`/projects/${project.slug}/units`}
                  className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all border border-white/10">
                  Browse All Units
                </Link>
                <button onClick={() => { setInquiryType('site_visit'); setShowInquiry(true); }}
                  className="flex-1 text-center py-2 bg-[#029bba] hover:bg-[#02a8c9] rounded-xl text-sm font-medium transition-all">
                  Schedule Site Visit
                </button>
              </div>
            </div>

          </div>{/* end left column */}

          {/* ── RIGHT SIDEBAR ── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Sticky wrapper */}
            <div className="sticky top-24 space-y-6">

              {/* Contact Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#029bba] to-[#004063] px-6 py-4">
                  <p className="text-white/70 text-xs uppercase tracking-wide">Unit {unit.unitNumber}</p>
                  <p className="text-white font-black text-xl">{formatPrice(unit.price)}</p>
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.text} ${status.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {isAvailable ? (
                    <>
                      <button
                        onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                        className="w-full bg-[#029bba] hover:bg-[#027a94] text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-[#029bba]/20 flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" />Book This Unit
                      </button>
                      <button onClick={() => handleContactReveal('call')}
                        className="w-full border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-[#029bba]" />
                        {revealedContact === 'call'
                          ? `Tap: ${project.developerProfile?.contactNumber}`
                          : 'Call Developer'}
                      </button>
                      <button onClick={() => handleContactReveal('whatsapp')}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                        <MessageCircle className="w-4 h-4" />
                        {revealedContact === 'whatsapp'
                          ? `Tap: ${project.developerProfile?.whatsappNumber || project.developerProfile?.contactNumber}`
                          : 'WhatsApp'}
                      </button>
                      <button onClick={() => { setInquiryType('call_back'); setShowInquiry(true); }}
                        className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                        <PhoneCall className="w-4 h-4" />Request Callback
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`w-full py-3 rounded-xl text-center font-bold border flex items-center justify-center gap-2 ${status.bg} ${status.text} ${status.border}`}>
                        {status.icon}{status.label}
                      </div>
                      <button onClick={() => { setInquiryType('general_inquiry'); setShowInquiry(true); }}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                        <MessageCircle className="w-4 h-4" />Get Notified
                      </button>
                    </>
                  )}
                  <p className="text-xs text-center text-gray-400">
                    🔒 {isLoggedIn ? 'Verified contact information' : 'Login to reveal contacts'}
                  </p>
                </div>
              </div>

              {/* Unit Quick Facts */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#029bba]" />Quick Facts
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Unit Number',  value: unit.unitNumber },
                    { label: 'Floor',        value: unit.floorName ?? `Floor ${unit.floorNumber}` },
                    { label: 'Type',         value: getUnitTypeLabel(unit.unitType) },
                    { label: 'Status',       value: status.label },
                    { label: 'Listing',      value: listing.label },
                    ...(unit.areaSqft ? [{ label: 'Area', value: `${unit.areaSqft.toLocaleString()} sqft` }] : []),
                    ...(unit.facing ? [{ label: 'Facing', value: unit.facing }] : []),
                    ...(unit.viewCount ? [{ label: 'Views', value: `${unit.viewCount.toLocaleString()}` }] : []),
                    ...(unit.createdAt ? [{ label: 'Listed', value: formatDate(unit.createdAt) }] : []),
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Developer card */}
              {project.developerProfile && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#029bba]" />Developer
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    {project.developerProfile.logoUrl ? (
                      <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-white p-1 flex-shrink-0 relative">
                        <Image src={project.developerProfile.logoUrl} alt={project.developerProfile.companyName ?? ''} fill className="object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">
                        {project.developerProfile.companyName || 'Verified Developer'}
                      </p>
                      {badgeCfg && (
                        <p className={`text-xs font-semibold ${badgeCfg.color}`}>
                          {badgeCfg.icon} {badgeCfg.label} Developer
                        </p>
                      )}
                    </div>
                  </div>
                  {project.developer && (
                    <Link href={`/developers/${project.developer}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors">
                      View Developer Profile <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )}

              {/* Safety note */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Safety First</p>
                    <p className="text-amber-700 text-xs">
                      Always visit the project site before making any payment. Verify all documents independently.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>{/* end sidebar */}

        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}
      <GalleryModal
        isOpen={galleryOpen && hasImages}
        onClose={() => setGalleryOpen(false)}
        images={images}
        initialIndex={galleryIndex}
        unitNumber={unit.unitNumber}
      />

      <UniversalInquiryModal
        isOpen={showInquiry}
        onClose={() => setShowInquiry(false)}
        entityType="project"
        entityId={typeof unit.project === 'string' ? unit.project : unit.project._id}
        entityTitle={`Unit ${unit.unitNumber} — ${project.projectName}`}
        entityPrice={unit.price}
        entityLocation={`${project.areaName}, ${project.city}`}
        entityImage={primaryImage}
        developerId={project.developer}
        developerName={project.developerProfile?.companyName}
        leadType={inquiryType}
        buttonText={
          inquiryType === 'site_visit' ? 'Schedule Visit'
          : inquiryType === 'call_back' ? 'Request Callback'
          : isAvailable ? 'Book This Unit'
          : 'Get Notified'
        }
      />

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#029bba] to-[#017a8a] px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {loginPromptType === 'call' ? <Phone className="w-8 h-8 text-white" /> : <MessageCircle className="w-8 h-8 text-white" />}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Login Required</h3>
              <p className="text-white/80 text-sm">Please login to view contact details</p>
            </div>
            <div className="px-6 py-6 space-y-3">
              <Link href={`/login?callbackUrl=/projects/${project.slug}/units/${unit._id}`}
                className="w-full bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                Login to Continue <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={`/login?mode=signup&callbackUrl=/projects/${project.slug}/units/${unit._id}`}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center transition-colors">
                Create Free Account
              </Link>
              <button
                onClick={() => { setShowLoginPrompt(false); setInquiryType('call_back'); setShowInquiry(true); }}
                className="w-full text-[#029bba] font-semibold text-sm hover:underline flex items-center justify-center gap-2 py-2">
                <PhoneCall className="w-4 h-4" />Request a Callback Instead
              </button>
            </div>
            <button onClick={() => setShowLoginPrompt(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================
// ISR DATA FETCHING
// ============================================

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    await dbConnect();

    // Get verified projects with their units
    const projects = await Project.find({
      isVerified: true,
      isDeleted: { $ne: true },
    }).select('_id slug').limit(50).lean();

    const paths: { params: { slug: string; unitId: string } }[] = [];

    for (const proj of projects) {
      if (!proj.slug) continue;
      const units = await Unit.find({
        project: proj._id,
        status: { $in: ['available', 'reserved'] },
      }).select('_id').limit(20).lean();

      for (const u of units) {
        paths.push({
          params: {
            slug:   proj.slug as string,
            unitId: (u._id as import('mongoose').Types.ObjectId).toString(),
          },
        });
      }
    }

    return { paths, fallback: 'blocking' };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug   = params?.slug as string;
  const unitId = params?.unitId as string;

  if (!slug || !unitId) return { notFound: true };

  // Validate unitId is a valid ObjectId
  if (!/^[a-f\d]{24}$/i.test(unitId)) return { notFound: true };

  try {
    await dbConnect();

    // Resolve project by slug
    const rawProject = await Project.findOne({
      slug,
      isDeleted: { $ne: true },
    })
      .populate('developer', 'companyName logo verificationLevel status slug')
      .lean() as Record<string, unknown> | null;

    if (!rawProject) return { notFound: true };

    // Visibility gate
    if (!rawProject.isVerified && rawProject.status !== 'verified') {
      return { notFound: true };
    }

    const projectId = rawProject._id as import('mongoose').Types.ObjectId;

    // Fetch unit — must belong to this project
    const rawUnit = await Unit.findOne({
      _id: unitId,
      project: projectId,
    }).lean() as Record<string, unknown> | null;

    if (!rawUnit) return { notFound: true };

    // Increment view count (fire-and-forget)
    Unit.updateOne({ _id: unitId }, { $inc: { viewCount: 1 } })
      .exec()
      .catch(() => undefined);

    // Serialize
    const project = JSON.parse(JSON.stringify(rawProject)) as ProjectInfo;
    const unit    = JSON.parse(JSON.stringify(rawUnit))    as UnitDetail;

    return {
      props: { unit, project },
      revalidate: 30,
    };
  } catch {
    return { notFound: true };
  }
};