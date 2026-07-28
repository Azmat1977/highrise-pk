// pages/projects/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { GetServerSideProps } from 'next';
import {
  Search, MapPin, Building2, Layers, X, Home,
  ShoppingBag, Briefcase, TrendingUp, CheckCircle2, ShieldCheck,
  ChevronLeft, ChevronRight, Flame, Heart, BarChart3,
  BadgeCheck, Sparkles, Award, Users, ArrowRight,
  ChevronDown, Banknote, Shield, Zap, ThumbsUp,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ProjectCard {
  _id: string;
  slug: string;
  projectName: string;
  tagline?: string | null;
  shortDescription?: string | null;
  city: string;
  area: string;
  projectCategory: string;
  projectNature: string;
  projectStatus: string;
  saleMode?: string | null;
  status: string;
  verificationStatus: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isTrustedBuilder?: boolean;
  developerBadge?: string | null;
  badgeLabel?: string | null;
  badgeEmoji?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  priceRangeText?: string | null;
  startingPriceFormatted?: string | null;
  highriseScore?: number | null;
  riskLevel?: string | null;
  deliveryStatus?: string | null;
  verificationLevel?: string | null;
  primaryImage: string | null;
  featureImageUrl?: string | null;
  developerId: string;
  developerName: string;
  developerLogoUrl?: string | null;
  unitTypesCount: number;
  totalUnits?: number | null;
  unitsAvailable?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface HotspotArea {
  area: string;
  city: string;
  projectCount: number;
  verifiedCount: number;
}

interface DiscoveryProject {
  _id: string;
  slug: string;
  projectName: string;
  tagline?: string;
  city: string;
  area: string;
  projectCategory: string;
  projectNature: string;
  projectStatus: string;
  isVerified: boolean;
  isFeatured: boolean;
  isTrustedBuilder: boolean;
  developerBadge?: string;
  badgeLabel?: string;
  badgeEmoji?: string;
  minPrice?: number;
  maxPrice?: number;
  highriseScore?: number;
  riskLevel?: string;
  primaryImage: string | null;
  developerName: string;
  developerLogoUrl?: string;
  totalUnits?: number;
  unitsAvailable?: number;
  createdAt: string;
}

type DiscoveryTab =
  | 'all_projects'
  | 'ready_to_move'
  | 'easy_installments'
  | 'new_launches'
  | 'top_builders'
  | 'govt_approved';

interface TrustedDeveloperCard {
  _id: string;
  slug: string;
  companyName: string;
  developerType: string;
  city: string;
  logo?: { url: string };
  coverImage?: { url: string };
  tagline?: string;
  isVerified: boolean;
  verificationLevel: string;
  highriseScore: number;
  badges: string[];
  completedProjectsCount: number;
  activeProjectsCount: number;
  averageRating: number;
  totalReviews: number;
  isFeatured: boolean;
  isPremiumPartner: boolean;
  establishedYear: number;
  operatingCities: string[];
}

interface BlogCard {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  image?: { url: string; public_id?: string };
  featured: boolean;
  authorName: string;
  authorAvatar?: string;
  publishedAt: string;
  createdAt: string;
  views?: number;
}

const DISCOVERY_TABS: Array<{ key: DiscoveryTab; label: string; emoji: string; description: string }> = [
  { key: 'all_projects',      label: 'All Projects',          emoji: '✨',  description: 'Complete collection of verified projects across Pakistan' },
  { key: 'ready_to_move',     label: 'Ready to Move',         emoji: '🏠',  description: 'Immediate possession — move in without waiting' },
  { key: 'easy_installments', label: 'On Easy Installments',  emoji: '💰',  description: 'Affordable monthly payment plans available' },
  { key: 'new_launches',      label: 'New Launches',          emoji: '🚀',  description: 'Fresh projects with best early-bird prices' },
  { key: 'top_builders',      label: 'Top Builders',          emoji: '🏆',  description: 'From Pakistan\u2019s most trusted developers' },
  { key: 'govt_approved',     label: 'Govt. Approved',        emoji: '🏛️',  description: 'Verified NOC and government approvals' },
];

interface PageProps {
  initialProjects: ProjectCard[];
  totalProjects: number;
  totalPages: number;
  hotspots: HotspotArea[];
  cityCounts: { city: string; count: number }[];
  categoryCounts: { category: string; count: number }[];
  platformStats: {
    totalProjects: number;
    totalDevelopers: number;
    totalCities: number;
    totalVerified: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

const PAKISTAN_CITIES = [
  'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Gujranwala',
  'Sialkot', 'Sargodha', 'Bahawalpur', 'Sukkur', 'Rahim Yar Khan',
  'Sahiwal', 'Gujrat', 'Mardan', 'Abbottabad', 'Mirpur', 'Muzaffarabad',
];

// CITY_IMAGES constant removed in Patch 10
// Reason: Only used by deleted "Browse by City" section
// Hotspot Areas uses gradient backgrounds instead of images

const CATEGORY_CONFIG = [
  { key: 'highrise',         label: 'High-Rise',       icon: Building2,   color: 'from-blue-500 to-blue-600' },
  { key: 'society',          label: 'Housing Society',  icon: Home,        color: 'from-green-500 to-green-600' },
  { key: 'commercial_plaza', label: 'Commercial Plaza', icon: ShoppingBag, color: 'from-purple-500 to-purple-600' },
  { key: 'mixed_use',        label: 'Mixed Use',        icon: Layers,      color: 'from-teal-500 to-teal-600' },
  { key: 'townhouse',        label: 'Townhouse',        icon: Home,        color: 'from-amber-500 to-amber-600' },
  { key: 'gated_community',  label: 'Gated Community',  icon: Shield,      color: 'from-indigo-500 to-indigo-600' },
];

const NATURE_CONFIG = [
  { key: 'residential', label: 'Residential', icon: Home },
  { key: 'commercial',  label: 'Commercial',  icon: Briefcase },
  { key: 'mixed',       label: 'Mixed Use',   icon: Layers },
];

const BUDGET_TIERS = [
  { key: 'under_50L',  label: 'Under 50 Lac',     short: '< 50L' },
  { key: '50L_to_1Cr', label: '50 Lac - 1 Crore',  short: '50L-1Cr' },
  { key: '1Cr_to_3Cr', label: '1 - 3 Crore',       short: '1-3 Cr' },
  { key: '3Cr_to_5Cr', label: '3 - 5 Crore',       short: '3-5 Cr' },
  { key: 'above_5Cr',  label: 'Above 5 Crore',      short: '5 Cr+' },
];

const QUICK_FILTERS = [
  { key: 'trusted',   label: '🟢 Trusted Only', param: 'trusted',  value: '1' },
  { key: 'featured',  label: '🔥 Hot Deals',    param: 'featured', value: '1' },
];

const SORT_OPTIONS = [
  { key: 'newest',      label: 'Newest First' },
  { key: 'price_asc',   label: 'Price: Low to High' },
  { key: 'price_desc',  label: 'Price: High to Low' },
  { key: 'popularity',  label: 'Most Popular' },
  { key: 'most_viewed', label: 'Most Viewed' },
];

const WHY_HIGHRISE = [
  {
    icon: ShieldCheck,
    title: '100% Verified',
    description: 'Every project verified by our team. NOC, approvals, and documents checked.',
    color: 'from-emerald-500 to-green-600',
  },
  {
    icon: Award,
    title: 'Trusted Developers',
    description: 'Only approved developers with verified track records and delivery history.',
    color: 'from-[#029bba] to-[#017a94]',
  },
  {
    icon: BarChart3,
    title: 'Investment Intelligence',
    description: 'ROI estimates, rental yields, and growth predictions for every project.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Zero Fake Listings',
    description: 'Anti-fraud system. Every listing verified. Scam projects blocked instantly.',
    color: 'from-red-500 to-red-600',
  },
  {
    icon: ThumbsUp,
    title: 'Zero Buyer Commission',
    description: 'No hidden fees. Transparent pricing. What you see is what you pay.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Zap,
    title: 'Modern Experience',
    description: 'AI-powered search, virtual tours, and instant contact with developers.',
    color: 'from-indigo-500 to-indigo-600',
  },
];

// ============================================
// HELPERS
// ============================================

function formatPrice(price?: number): string {
  if (!price || price <= 0) return '';
  if (price >= 10_000_000) {
    const crore = price / 10_000_000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Cr`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(2)} Lac`;
  }
  return `Rs ${price.toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function getBadgeColor(badge?: string): string {
  switch (badge) {
    case 'premium':     return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
    case 'trusted':     return 'bg-gradient-to-r from-[#029bba] to-[#017a94] text-white';
    case 'emerging':    return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    case 'new_entrant': return 'bg-gray-100 text-gray-700';
    default:            return 'bg-gray-100 text-gray-600';
  }
}

function getRiskColor(risk?: string): string {
  switch (risk) {
    case 'low':    return 'text-green-600 bg-green-50 border-green-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'high':   return 'text-red-600 bg-red-50 border-red-200';
    default:       return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

function getScoreColor(score?: number): string {
  if (!score) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

// ============================================
// SUB-COMPONENT: ENHANCED PROJECT CARD
// ============================================

function ProjectCardEnhanced({ project }: { project: ProjectCard }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group bg-white rounded-2xl border border-gray-200
                 hover:border-[#029bba]/30 hover:shadow-xl overflow-hidden
                 transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Image */}
      <div className="relative h-52 bg-gray-100 overflow-hidden">
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={`${project.projectName} in ${project.area}, ${project.city}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Building2 className="w-14 h-14 text-gray-300" />
          </div>
        )}
        {/* Badge stack */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {project.isVerified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#029bba]
                             text-white text-[10px] font-bold rounded-full shadow-md">
              <CheckCircle2 className="w-3 h-3" />VERIFIED
            </span>
          )}
          {project.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500
                             text-white text-[10px] font-bold rounded-full shadow-md">
              <Flame className="w-3 h-3" />FEATURED
            </span>
          )}
          {project.isTrustedBuilder && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500
                             text-white text-[10px] font-bold rounded-full shadow-md">
              <ShieldCheck className="w-3 h-3" />TRUSTED
            </span>
          )}
        </div>
        {/* Trust Score */}
        {project.highriseScore && (
          <div className="absolute top-3 right-3">
            <div className="w-11 h-11 rounded-full bg-white shadow-lg border
                            border-gray-100 flex flex-col items-center justify-center">
              <span className={`text-sm font-black leading-none ${getScoreColor(project.highriseScore)}`}>
                {project.highriseScore}
              </span>
              <span className="text-[7px] text-gray-400 font-bold">SCORE</span>
            </div>
          </div>
        )}
        {/* Category chip */}
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-gray-700
                           text-[11px] font-semibold rounded-full shadow-sm">
            {CATEGORY_CONFIG.find(c => c.key === project.projectCategory)?.label ?? project.projectCategory}
          </span>
        </div>
        {/* Freshness */}
        <div className="absolute bottom-3 right-3">
          <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white
                           text-[10px] font-medium rounded-full">
            {timeAgo(project.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-gray-900 mb-1.5
                       group-hover:text-[#029bba] transition-colors line-clamp-1">
          {project.projectName}
        </h3>
        <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-3">
          <MapPin className="w-4 h-4 text-[#029bba] flex-shrink-0" />
          <span className="line-clamp-1">{project.area}, {project.city}</span>
        </p>

        {/* Info pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100
                           text-gray-600 text-[11px] font-medium rounded-md">
            {project.projectNature === 'residential' && <Home className="w-3 h-3" />}
            {project.projectNature === 'commercial'  && <Briefcase className="w-3 h-3" />}
            {project.projectNature === 'mixed'       && <Layers className="w-3 h-3" />}
            {NATURE_CONFIG.find(n => n.key === project.projectNature)?.label}
          </span>
          {project.projectStatus && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-md">
              {project.projectStatus}
            </span>
          )}
          {project.riskLevel && (
            <span className={`px-2 py-1 text-[11px] font-medium rounded-md border ${getRiskColor(project.riskLevel)}`}>
              {project.riskLevel === 'low' ? '🟢' : project.riskLevel === 'medium' ? '🟡' : '🔴'}
              {' '}{project.riskLevel.charAt(0).toUpperCase() + project.riskLevel.slice(1)} Risk
            </span>
          )}
        </div>

        {/* Developer */}
        {project.developerName && (
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
            {project.developerLogoUrl ? (
              <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden
                              border border-gray-200 flex-shrink-0 relative">
                <Image
                  src={project.developerLogoUrl}
                  alt={project.developerName}
                  fill
                  className="object-contain p-0.5"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center
                              justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {project.developerName}
              </p>
              {project.developerBadge && project.developerBadge !== 'new_entrant' && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5
                                  rounded-full text-[9px] font-bold
                                  ${getBadgeColor(project.developerBadge)}`}>
                  {project.badgeEmoji} {project.badgeLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Units */}
        {(project.totalUnits || project.unitsAvailable) && (
          <div className="flex items-center gap-4 mb-4 text-sm">
            {project.totalUnits && (
              <div>
                <span className="text-gray-400 text-xs">Total</span>
                <p className="font-bold text-gray-900">{project.totalUnits}</p>
              </div>
            )}
            {project.unitsAvailable !== undefined && (
              <div>
                <span className="text-gray-400 text-xs">Available</span>
                <p className="font-bold text-green-600">{project.unitsAvailable}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="flex items-end justify-between pt-4 border-t border-gray-100">
          {project.minPrice ? (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Starting From
              </p>
              <p className="text-lg font-black text-[#029bba]">
                PKR {formatPrice(project.minPrice)}
              </p>
              {project.maxPrice && project.maxPrice > project.minPrice && (
                <p className="text-[11px] text-gray-400">
                  to {formatPrice(project.maxPrice)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Contact for price</p>
          )}
          <span className="inline-flex items-center gap-1 text-[#029bba] text-sm
                           font-bold group-hover:gap-2 transition-all
                           bg-[#029bba]/10 px-3 py-2 rounded-xl">
            View <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// SUB-COMPONENT: FEATURED SHOWCASE
// ============================================

function FeaturedShowcase({ projects, city }: { projects: ProjectCard[]; city?: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (projects.length <= 1 || dismissed) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % projects.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [projects.length, dismissed]);

  if (dismissed || projects.length === 0) return null;
  const active = projects[activeIdx];
  if (!active) return null;

  return (
    <div className="relative bg-gradient-to-r from-[#001a2e] to-[#002d4a]
                    border-y border-[#029bba]/20 overflow-hidden">
      {active.primaryImage && (
        <div className="absolute inset-0">
          <Image src={active.primaryImage} alt="" fill
            className="object-cover opacity-20" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r
                          from-[#001a2e]/90 via-[#001a2e]/70 to-transparent" />
        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                            bg-amber-500/20 border border-amber-500/30 text-amber-400
                            text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {city ? `MOST POPULAR IN ${city.toUpperCase()}` : 'MOST POPULAR NEW PROJECTS'}
              {projects.length > 1 && (
                <span className="opacity-70">{activeIdx + 1}/{projects.length}</span>
              )}
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
              {active.projectName}
            </h3>
            <p className="text-white/60 flex items-center gap-1.5 mb-4">
              <MapPin className="w-4 h-4 text-[#029bba]" />
              {active.area}, {active.city}
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              {active.minPrice && (
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider">Starting From</p>
                  <p className="text-2xl font-black text-white">PKR {formatPrice(active.minPrice)}</p>
                </div>
              )}
              {active.highriseScore && (
                <div className="px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                  <p className="text-white/50 text-xs">Trust Score</p>
                  <p className={`text-lg font-black ${getScoreColor(active.highriseScore)}`}>
                    {active.highriseScore}/100
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/projects/${active.slug}`}
                className="inline-flex items-center gap-2 px-6 py-3
                           bg-gradient-to-r from-[#029bba] to-[#017a94]
                           hover:from-[#02a8c9] hover:to-[#018a9a]
                           text-white font-bold rounded-xl transition-all
                           shadow-lg shadow-[#029bba]/30">
                View Project <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setDismissed(true)}
                className="inline-flex items-center gap-2 px-5 py-3
                           bg-white/10 hover:bg-white/20 text-white font-semibold
                           rounded-xl transition-all border border-white/10">
                Skip
              </button>
            </div>
          </div>
          {active.primaryImage && (
            <div className="hidden md:block w-80 h-52 relative rounded-2xl
                            overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
              <Image src={active.primaryImage} alt={active.projectName}
                fill className="object-cover" sizes="320px" />
            </div>
          )}
        </div>
        {projects.length > 1 && (
          <div className="flex items-center gap-2 mt-6">
            {projects.map((_, idx) => (
              <button key={idx} onClick={() => setActiveIdx(idx)}
                aria-label={`Show featured project ${idx + 1}`}
                className={`rounded-full transition-all ${
                  idx === activeIdx ? 'w-6 h-2 bg-[#029bba]' : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`} />
            ))}
          </div>
        )}
      </div>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss featured section"
        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10
                   hover:bg-white/20 text-white/60 hover:text-white transition-all">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// TrendingCard component removed in Patch 10
// Reason: No longer used after Trending Carousel section deletion
// Discovery tabs handle all trending content now

// ============================================
// SUB-COMPONENT: DISCOVERY TABS
// ============================================

function DiscoveryTabsSection({ city }: { city?: string }) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('all_projects');
  const [tabData, setTabData] = useState<Record<DiscoveryTab, DiscoveryProject[]>>({
    all_projects: [], ready_to_move: [], easy_installments: [], new_launches: [], top_builders: [], govt_approved: [],
  });
  const [loading, setLoading] = useState<Record<DiscoveryTab, boolean>>({
    all_projects: false, ready_to_move: false, easy_installments: false, new_launches: false, top_builders: false, govt_approved: false,
  });
  const [error, setError] = useState<Record<DiscoveryTab, string>>({
    all_projects: '', ready_to_move: '', easy_installments: '', new_launches: '', top_builders: '', govt_approved: '',
  });
  const abortRef = useRef<AbortController | null>(null);

  const fetchTab = useCallback(async (tab: DiscoveryTab) => {
    if (tabData[tab].length > 0 || loading[tab]) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(prev => ({ ...prev, [tab]: true }));
    setError(prev => ({ ...prev, [tab]: '' }));

    try {
      const params = new URLSearchParams({ tab, limit: '8' });
      if (city) params.append('city', city);

      const res = await fetch(`/api/projects/discovery?${params.toString()}`, {
        signal: controller.signal,
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      const data = await res.json() as {
        success: boolean;
        projects?: DiscoveryProject[];
        message?: string;
      };

      if (!res.ok || !data?.success) {
        setError(prev => ({ ...prev, [tab]: data?.message || 'Failed to load projects.' }));
        return;
      }

      setTabData(prev => ({ ...prev, [tab]: data.projects ?? [] }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(prev => ({ ...prev, [tab]: 'Something went wrong. Please try again.' }));
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [city, tabData, loading]);

  // Fetch initial tab + refetch all when city changes
  useEffect(() => {
    setTabData({ all_projects: [], ready_to_move: [], easy_installments: [], new_launches: [], top_builders: [], govt_approved: [] });
    void fetchTab('all_projects');
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Fetch on tab switch (lazy)
  useEffect(() => {
    void fetchTab(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentProjects = tabData[activeTab];
  const isLoading = loading[activeTab];
  const currentError = error[activeTab];

  return (
    <div className="bg-white py-12 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold text-[#029bba] uppercase tracking-widest mb-2">
              Discover More
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">
              Explore Projects
              {city && <span className="text-[#029bba]"> in {city}</span>}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Handpicked collections across categories
            </p>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {DISCOVERY_TABS.map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                         font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#029bba] text-white border-[#029bba] shadow-lg shadow-[#029bba]/25'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#029bba]/40 hover:text-[#029bba]'
              }`}>
              <span className="text-base">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-sm text-gray-500 mb-6 italic">
          {DISCOVERY_TABS.find(t => t.key === activeTab)?.description}
        </p>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && currentError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700 mb-3">{currentError}</p>
            <button onClick={() => void fetchTab(activeTab)}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg
                         hover:bg-red-600 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !currentError && currentProjects.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Building2 className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 text-sm">No projects in this collection yet</h3>
            <p className="text-xs text-gray-500">
              Check back soon or explore other tabs above.
            </p>
          </div>
        )}

        {/* Project cards - horizontal scroll */}
        {!isLoading && !currentError && currentProjects.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 snap-x snap-mandatory">
            {currentProjects.map(project => (
              <Link key={project._id} href={`/projects/${project.slug}`}
                className="group flex-shrink-0 w-72 bg-white rounded-2xl border border-gray-200
                           hover:border-[#029bba]/30 hover:shadow-xl overflow-hidden
                           transition-all duration-300 hover:-translate-y-1 snap-start">
                {/* Image */}
                <div className="relative h-44 bg-gray-100 overflow-hidden">
                  {project.primaryImage ? (
                    <Image src={project.primaryImage} alt={project.projectName} fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="288px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {/* Top badges — tab-specific highlight */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {project.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#029bba]
                                       text-white text-[10px] font-bold rounded-full shadow-md">
                        <CheckCircle2 className="w-2.5 h-2.5" />VERIFIED
                      </span>
                    )}
                    {activeTab === 'new_launches' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500
                                       text-white text-[10px] font-bold rounded-full shadow-md">
                        <Sparkles className="w-2.5 h-2.5" />NEW
                      </span>
                    )}
                    {activeTab === 'ready_to_move' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500
                                       text-white text-[10px] font-bold rounded-full shadow-md">
                        <Home className="w-2.5 h-2.5" />READY
                      </span>
                    )}
                    {activeTab === 'easy_installments' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500
                                       text-white text-[10px] font-bold rounded-full shadow-md">
                        <Banknote className="w-2.5 h-2.5" />EASY PAY
                      </span>
                    )}
                    {activeTab === 'govt_approved' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600
                                       text-white text-[10px] font-bold rounded-full shadow-md">
                        <ShieldCheck className="w-2.5 h-2.5" />NOC
                      </span>
                    )}
                    {activeTab === 'top_builders' && project.developerBadge && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500
                                       text-white text-[10px] font-bold rounded-full shadow-md">
                        <Award className="w-2.5 h-2.5" />TOP
                      </span>
                    )}
                  </div>
                  {/* Score */}
                  {project.highriseScore && (
                    <div className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white shadow-lg
                                    flex flex-col items-center justify-center">
                      <span className={`text-xs font-black leading-none ${getScoreColor(project.highriseScore)}`}>
                        {project.highriseScore}
                      </span>
                      <span className="text-[7px] text-gray-400 font-bold">SCORE</span>
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1
                                 group-hover:text-[#029bba] transition-colors">
                    {project.projectName}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3 flex-shrink-0 text-[#029bba]" />
                    <span className="line-clamp-1">{project.area}, {project.city}</span>
                  </p>
                  {/* Developer badge */}
                  {project.developerName && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                      {project.developerLogoUrl ? (
                        <div className="w-6 h-6 rounded-md bg-gray-100 overflow-hidden relative flex-shrink-0">
                          <Image src={project.developerLogoUrl} alt={project.developerName} fill
                            className="object-contain p-0.5" sizes="24px" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                      <span className="text-xs text-gray-600 font-medium truncate">
                        {project.developerName}
                      </span>
                      {project.badgeEmoji && (
                        <span className="text-xs flex-shrink-0" title={project.badgeLabel}>
                          {project.badgeEmoji}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Price + CTA */}
                  <div className="flex items-end justify-between">
                    {project.minPrice ? (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">From</p>
                        <p className="font-black text-[#029bba] text-base">PKR {formatPrice(project.minPrice)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Contact for price</p>
                    )}
                    <span className="inline-flex items-center gap-0.5 text-[#029bba] text-xs
                                     font-bold group-hover:gap-1 transition-all">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENT: TRUSTED DEVELOPERS (Elegant)
// ============================================

function TrustedDevelopersSection({ city }: { city?: string }) {
  const [developers, setDevelopers] = useState<TrustedDeveloperCard[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const abortRef                    = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchDevelopers = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ sort: 'rating', limit: '8' });
        if (city) params.append('city', city);

        const res = await fetch(`/api/developers?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        const data = await res.json() as {
          success: boolean;
          data?: { developers?: TrustedDeveloperCard[] };
          message?: string;
        };

        if (!res.ok || !data?.success) {
          setError(data?.message || 'Failed to load developers.');
          return;
        }
        setDevelopers(data.data?.developers ?? []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchDevelopers();
    return () => { abortRef.current?.abort(); };
  }, [city]);

  // Hide section entirely if empty
  if (!loading && !error && developers.length === 0) return null;

  return (
    <div className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4">

        {/* ── ELEGANT HEADER ─────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          {/* Small accent line */}
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-[#029bba]" />
            <span className="text-xs font-bold text-[#029bba] uppercase tracking-[0.2em]">
              Trusted Partners
            </span>
            <span className="h-px w-8 bg-[#029bba]" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
            Pakistan&apos;s{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#029bba] to-[#017a94]">
              Leading Developers
            </span>
          </h2>
          <p className="text-gray-500 text-base md:text-lg leading-relaxed">
            {city
              ? `Top-rated builders with active projects in ${city} and across Pakistan. Verified credentials, delivered on promise.`
              : 'Trusted names shaping Pakistan\u2019s skyline. Every developer verified, every project delivered on promise.'
            }
          </p>
        </div>

        {/* ── LOADING SKELETON ──────────────── */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="text-center animate-pulse">
                <div className="w-24 h-24 bg-gray-100 rounded-2xl mx-auto mb-4" />
                <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        )}

        {/* ── ERROR STATE ───────────────────── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md mx-auto">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── AUTO-SCROLLING CAROUSEL WITH ARROWS ──────── */}
        {!loading && !error && developers.length > 0 && (
          <>
            {/* Carousel wrapper — arrows sit OUTSIDE the scroll zone */}
            <div className="relative group/carousel flex items-center gap-3 md:gap-4">

              {/* ← LEFT ARROW (outside scroll zone) */}
              <button
                type="button"
                aria-label="Scroll developers left"
                onClick={() => {
                  const track = document.getElementById('dev-carousel-track');
                  if (track) {
                    track.classList.remove('animate-marquee');
                    track.scrollBy({ left: -240, behavior: 'smooth' });
                    setTimeout(() => {
                      track.classList.add('animate-marquee');
                    }, 3000);
                  }
                }}
                className="hidden md:flex flex-shrink-0
                           w-11 h-11 rounded-full bg-white
                           border border-gray-200 shadow-md
                           items-center justify-center
                           text-gray-400 hover:text-white
                           hover:bg-[#029bba] hover:border-[#029bba]
                           hover:shadow-lg hover:shadow-[#029bba]/25
                           opacity-60 group-hover/carousel:opacity-100
                           transition-all duration-300
                           active:scale-95 z-10">
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* SCROLL ZONE — logos live here */}
              <div className="flex-1 min-w-0 overflow-hidden py-4"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                }}>
                {/* Track — duplicated content for seamless loop */}
                <div id="dev-carousel-track"
                  className="flex gap-8 md:gap-12 overflow-x-auto scrollbar-none animate-marquee hover:[animation-play-state:paused]"
                  style={{ width: 'max-content' }}>
                {[...developers, ...developers, ...developers].map((dev, idx) => {
                  const totalProjects = dev.completedProjectsCount + dev.activeProjectsCount;
                  const yearsInBiz    = dev.establishedYear > 1900
                    ? new Date().getFullYear() - dev.establishedYear
                    : 0;

                  return (
                    <Link key={`${dev._id}-${idx}`} href={`/developers/${dev.slug}`}
                      className="group flex-shrink-0 text-center w-40 md:w-48">

                      {/* Logo */}
                      <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto mb-4">
                        <div className="relative w-full h-full rounded-2xl bg-white
                                        border border-gray-200 group-hover:border-[#029bba]/50
                                        overflow-hidden transition-all duration-300
                                        group-hover:shadow-xl group-hover:shadow-[#029bba]/10
                                        group-hover:-translate-y-1">
                          {dev.logo?.url ? (
                            <Image src={dev.logo.url} alt={dev.companyName} fill
                              className="object-contain p-3 group-hover:scale-110 transition-transform duration-300"
                              sizes="(max-width: 768px) 96px, 112px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                              <Building2 className="w-10 h-10 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Verified checkmark */}
                        {dev.isVerified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full
                                          bg-[#029bba] border-2 border-white flex items-center
                                          justify-center shadow-md">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}

                        {/* Premium badge */}
                        {dev.isPremiumPartner && (
                          <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full
                                          bg-gradient-to-br from-purple-500 to-purple-600
                                          border-2 border-white flex items-center justify-center
                                          shadow-md" title="Premium Partner">
                            <span className="text-[10px]">💎</span>
                          </div>
                        )}
                      </div>

                      {/* Company name */}
                      <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight
                                     mb-1.5 line-clamp-1 group-hover:text-[#029bba]
                                     transition-colors">
                        {dev.companyName}
                      </h3>

                      {/* Metadata */}
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1">
                        {dev.city}
                        {totalProjects > 0 && (
                          <>
                            <span className="mx-1.5 text-gray-300">•</span>
                            <span className="font-semibold text-gray-700">
                              {totalProjects} Project{totalProjects !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </p>

                      {/* Badge */}
                      {(yearsInBiz > 0 || dev.averageRating > 0) && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1
                                        bg-gray-50 border border-gray-100 rounded-full
                                        text-[10px] font-semibold text-gray-600
                                        group-hover:border-[#029bba]/30 group-hover:bg-[#029bba]/5
                                        group-hover:text-[#029bba] transition-all">
                          {yearsInBiz > 0 ? (
                            <>
                              <Award className="w-2.5 h-2.5" />
                              {yearsInBiz}+ Years Experience
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              {dev.averageRating.toFixed(1)} ★ Rating
                            </>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
                </div>
              </div>
              {/* End scroll zone */}

              {/* → RIGHT ARROW (outside scroll zone) */}
              <button
                type="button"
                aria-label="Scroll developers right"
                onClick={() => {
                  const track = document.getElementById('dev-carousel-track');
                  if (track) {
                    track.classList.remove('animate-marquee');
                    track.scrollBy({ left: 240, behavior: 'smooth' });
                    setTimeout(() => {
                      track.classList.add('animate-marquee');
                    }, 3000);
                  }
                }}
                className="hidden md:flex flex-shrink-0
                           w-11 h-11 rounded-full bg-white
                           border border-gray-200 shadow-md
                           items-center justify-center
                           text-gray-400 hover:text-white
                           hover:bg-[#029bba] hover:border-[#029bba]
                           hover:shadow-lg hover:shadow-[#029bba]/25
                           opacity-60 group-hover/carousel:opacity-100
                           transition-all duration-300
                           active:scale-95 z-10">
                <ChevronRight className="w-5 h-5" />
              </button>

            </div>
            {/* End carousel wrapper */}

            {/* ── Elegant "View All" CTA ─────── */}
            <div className="mt-14 text-center">
              <Link href="/developers"
                className="inline-flex items-center gap-2 px-6 py-3
                           border-2 border-gray-900 text-gray-900 font-bold text-sm
                           rounded-full hover:bg-[#029bba] hover:border-[#029bba] hover:text-white
                           transition-all duration-300 group
                           shadow-sm hover:shadow-lg hover:shadow-[#029bba]/25">
                Explore All Developers
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENT: BLOG INSIGHTS
// ============================================

function BlogInsightsSection() {
  const [blogs, setBlogs]     = useState<BlogCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const abortRef              = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchBlogs = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          status: 'published',
          sort: 'latest',
          limit: '3',
        });

        const res = await fetch(`/api/blogs?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        const data = await res.json() as {
          success: boolean;
          blogs?: BlogCard[];
          message?: string;
        };

        if (!res.ok || !data?.success) {
          setError(data?.message || 'Failed to load insights.');
          return;
        }
        setBlogs(data.blogs ?? []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchBlogs();
    return () => { abortRef.current?.abort(); };
  }, []);

  // Hide section entirely if empty (silent fail)
  if (!loading && !error && blogs.length === 0) return null;

  // Time ago helper (inline for isolation)
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const readTime = (excerpt: string): number => {
    const words = (excerpt || '').split(/\s+/).length;
    return Math.max(2, Math.ceil(words / 40));
  };

  return (
    <div className="bg-gray-50 py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4">

        {/* ── HEADER ──────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-[#029bba] uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Real Estate Insights
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">
              Expert Guides &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#029bba] to-[#017a94]">
                Market Insights
              </span>
            </h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Everything you need to know before investing in Pakistan&apos;s property market
            </p>
          </div>
          <Link href="/blogs"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5
                       bg-white border border-gray-200 hover:border-[#029bba]/40
                       text-[#029bba] font-bold text-sm rounded-xl transition-all
                       hover:shadow-md group">
            View All Articles
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ── LOADING SKELETON ──────────────── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ERROR STATE ───────────────────── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── BLOG CARDS ───────────────────── */}
        {!loading && !error && blogs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogs.map((blog, idx) => {
                const isFirst = idx === 0;
                return (
                  <Link key={blog._id} href={`/blogs/${blog.slug}`}
                    className={`group bg-white rounded-2xl overflow-hidden border border-gray-200
                               hover:border-[#029bba]/30 hover:shadow-xl transition-all
                               duration-300 hover:-translate-y-1 flex flex-col ${
                                 isFirst ? 'md:col-span-1' : ''
                               }`}>

                    {/* Image */}
                    <div className="relative h-52 bg-gray-100 overflow-hidden">
                      {blog.image?.url ? (
                        <Image src={blog.image.url}
                          alt={blog.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 33vw" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <Sparkles className="w-12 h-12 text-gray-300" />
                        </div>
                      )}

                      {/* Gradient overlay for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* Category badge */}
                      {blog.category && (
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5
                                           bg-white/95 backdrop-blur-sm text-[#029bba]
                                           text-[10px] font-black uppercase tracking-wider
                                           rounded-full shadow-md">
                            {blog.category}
                          </span>
                        </div>
                      )}

                      {/* Featured badge */}
                      {blog.featured && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5
                                           bg-gradient-to-r from-amber-500 to-orange-500
                                           text-white text-[10px] font-black tracking-wider
                                           rounded-full shadow-lg">
                            <Sparkles className="w-3 h-3" />
                            FEATURED
                          </span>
                        </div>
                      )}

                      {/* Read time (bottom left) */}
                      <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1
                                         bg-black/50 backdrop-blur-sm text-white
                                         text-[10px] font-semibold rounded-full">
                          <Zap className="w-2.5 h-2.5" />
                          {readTime(blog.excerpt)} min read
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      {/* Title */}
                      <h3 className="font-black text-gray-900 text-lg leading-snug mb-2
                                     group-hover:text-[#029bba] transition-colors line-clamp-2">
                        {blog.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-4 flex-1">
                        {blog.excerpt}
                      </p>

                      {/* Footer: author + date */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          {blog.authorAvatar ? (
                            <div className="w-7 h-7 rounded-full bg-gray-100 overflow-hidden
                                            border border-gray-200 relative flex-shrink-0">
                              <Image src={blog.authorAvatar}
                                alt={blog.authorName}
                                fill
                                className="object-cover"
                                sizes="28px" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#029bba]
                                            to-[#017a94] flex items-center justify-center
                                            text-white text-[10px] font-black flex-shrink-0">
                              {blog.authorName?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">
                              {blog.authorName || 'Highrise Team'}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {formatDate(blog.publishedAt || blog.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Arrow */}
                        <span className="inline-flex items-center gap-1 text-[#029bba]
                                         text-xs font-bold group-hover:gap-2 transition-all
                                         flex-shrink-0">
                          Read
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile "View All" */}
            <div className="md:hidden mt-6 text-center">
              <Link href="/blogs"
                className="inline-flex items-center gap-2 px-6 py-3
                           bg-white border border-gray-200 hover:border-[#029bba]/40
                           text-[#029bba] font-bold text-sm rounded-xl transition-all
                           shadow-sm hover:shadow-md">
                View All Articles
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Bottom banner: Ask Highrise.pk Expert CTA */}
            <div className="mt-10 bg-gradient-to-r from-[#029bba] to-[#017a94] rounded-2xl
                            overflow-hidden shadow-xl relative">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-white text-center md:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm
                                  border border-white/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black mb-1">
                      Confused? Ask Highrise.pk Expert
                    </h3>
                    <p className="text-white/80 text-sm">
                      Get instant expert answers about any project, price, or investment decision
                    </p>
                  </div>
                </div>
                <Link href="/aleem-ai"
                  className="inline-flex items-center gap-2 px-6 py-3
                             bg-white text-[#029bba] font-bold text-sm rounded-xl
                             hover:bg-white/90 transition-all shadow-lg
                             whitespace-nowrap group">
                  Chat with Expert
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ProjectsListingPage({
  initialProjects,
  totalProjects: ssrTotal,
  totalPages: ssrTotalPages,
  hotspots,
  cityCounts,
  categoryCounts,
  platformStats,
}: PageProps) {
  const abortRef       = useRef<AbortController | null>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectGridRef = useRef<HTMLDivElement | null>(null);
  const filtersRef     = useRef({ searchQuery: '', city: '', projectCategory: '', projectNature: '', budgetTier: '', sortBy: 'newest', quickFilters: {} as Record<string, boolean> });

  const [projects,    setProjects]    = useState<ProjectCard[]>(initialProjects);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [totalCount,  setTotalCount]  = useState(ssrTotal);
  const [totalPages,  setTotalPages]  = useState(ssrTotalPages);
  const [page,        setPage]        = useState(1);

  const [searchQuery,      setSearchQuery]      = useState('');
  const [city,             setCity]             = useState('');
  const [projectCategory,  setProjectCategory]  = useState('');
  const [projectNature,    setProjectNature]    = useState('');
  const [budgetTier,       setBudgetTier]       = useState('');
  const [sortBy,           setSortBy]           = useState('newest');
  const [quickFilters,     setQuickFilters]     = useState<Record<string, boolean>>({});
  const [activeHotspotCity,setActiveHotspotCity]= useState(() => city || 'Islamabad');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';

  const canonicalUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    const qs = params.toString();
    return `${siteUrl}/projects${qs ? `?${qs}` : ''}`;
  }, [city, siteUrl]);

  // Keep filtersRef in sync
  useEffect(() => {
    filtersRef.current = { searchQuery, city, projectCategory, projectNature, budgetTier, sortBy, quickFilters };
  }, [searchQuery, city, projectCategory, projectNature, budgetTier, sortBy, quickFilters]);

  const fetchProjects = useCallback(async (opts?: { resetPage?: boolean; pageNum?: number }) => {
    const resetPage  = opts?.resetPage !== false;
    const currentPage = resetPage ? 1 : (opts?.pageNum ?? page);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (resetPage) setPage(1);
    setLoading(true);
    setError('');

    const f = filtersRef.current;
    try {
      const params = new URLSearchParams();
      if (f.searchQuery.trim()) params.append('search', f.searchQuery.trim());
      if (f.city)              params.append('city', f.city);
      if (f.projectCategory)   params.append('projectCategory', f.projectCategory);
      if (f.projectNature)     params.append('projectNature', f.projectNature);
      if (f.budgetTier)        params.append('budgetTier', f.budgetTier);
      if (f.sortBy)            params.append('sort', f.sortBy);
      if (f.quickFilters.trusted)  params.append('trusted', '1');
      if (f.quickFilters.featured) params.append('featured', '1');
      params.append('page',  String(currentPage));
      params.append('limit', '12');

      const res = await fetch(`/api/projects?${params.toString()}`, {
        signal: controller.signal,
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      const data = await res.json() as {
        success: boolean;
        message?: string;
        projects?: ProjectCard[];
        pagination?: { total?: number; totalPages?: number };
      };

      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to load projects.');
        setProjects([]);
        return;
      }

      setProjects(data.projects ?? []);
      setTotalCount(data.pagination?.total ?? data.projects?.length ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Something went wrong. Please try again.');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchProjects({ resetPage: true }); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, city, projectCategory, projectNature, budgetTier, sortBy, quickFilters]);

  useEffect(() => {
    if (page > 1) void fetchProjects({ resetPage: false, pageNum: page });
  }, [page]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleQuickFilter = (key: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Smart city filter — updates ALL page sections + smooth scroll feedback
  const applyCityFilter = useCallback((cityName: string, scrollToGrid: boolean = false) => {
    setActiveHotspotCity(cityName);
    setCity(cityName);
    if (scrollToGrid) {
      setTimeout(() => {
        projectGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  // Quick chip filter — applies Pakistani-market shortcuts and scrolls to results
  const applyQuickChip = useCallback((chipKey: string) => {
    switch (chipKey) {
      case 'ready_to_move':
        setProjectCategory('');
        setSearchQuery('ready to move');
        break;
      case 'easy_payment':
        setSearchQuery('installment');
        break;
      case 'govt_approved':
        setSearchQuery('approved noc');
        break;
      case 'trusted':
        setQuickFilters(prev => ({ ...prev, trusted: !prev.trusted }));
        break;
      case 'hot_deals':
        setQuickFilters(prev => ({ ...prev, featured: !prev.featured }));
        break;
      case 'under_1cr':
        setBudgetTier('50L_to_1Cr');
        break;
      case 'under_50L':
        setBudgetTier('under_50L');
        break;
      case 'above_5Cr':
        setBudgetTier('above_5Cr');
        break;
      default:
        break;
    }
    // Auto-scroll to results
    setTimeout(() => {
      projectGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, []);

  const clearAllFilters = () => {
    setSearchQuery(''); setCity(''); setProjectCategory('');
    setProjectNature(''); setBudgetTier(''); setSortBy('newest');
    setQuickFilters({});
  };

  const hasActiveFilters = !!(searchQuery || city || projectCategory || projectNature || budgetTier || Object.values(quickFilters).some(Boolean));
  const cityHotspots = hotspots.filter(h => h.city === activeHotspotCity);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Real Estate Projects in Pakistan',
    description: 'Verified real estate projects across Pakistan.',
    url: canonicalUrl,
    numberOfItems: totalCount,
    itemListElement: projects.slice(0, 10).map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'RealEstateListing',
        name: p.projectName,
        url: `${siteUrl}/projects/${p.slug}`,
        image: p.primaryImage ?? undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: p.area,
          addressRegion: p.city,
          addressCountry: 'PK',
        },
      },
    })),
  };

  return (
    <>
      <Head>
        <title>
          {city
            ? `Projects in ${city} | Verified Developers | Highrise.pk`
            : 'New Projects in Pakistan | Trusted Developers | Highrise.pk'}
        </title>
        <meta name="description" content={
          city
            ? `Explore ${totalCount}+ verified projects in ${city} on Highrise.pk.`
            : 'Explore verified high-rise and society projects across Pakistan with trusted developer badges.'
        } />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title"       content={city ? `Projects in ${city} | Highrise.pk` : 'New Projects in Pakistan | Highrise.pk'} />
        <meta property="og:description" content="Discover trusted and verified projects with approvals, NOC details, and transparent pricing." />
        <meta property="og:url"         content={canonicalUrl} />
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="Highrise.pk" />
        <meta name="twitter:card"       content="summary_large_image" />
        {(projectCategory || projectNature || budgetTier || Object.values(quickFilters).some(Boolean) || page > 1) && (
          <meta name="robots" content="noindex, follow" />
        )}
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ══════════════════════════════════════
            HERO + SEARCH
        ══════════════════════════════════════ */}
        <div className="relative bg-[#001a2e] text-white overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#001a2e] via-[#002d4a] to-[#001a2e]" />
            <div className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(#029bba 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          </div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#029bba]
                            rounded-full blur-[150px] opacity-15 translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500
                            rounded-full blur-[120px] opacity-10 -translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative z-10 pt-20 pb-32">
            <div className="max-w-6xl mx-auto px-4 text-center">

              {/* Breadcrumb */}
              <div className="flex items-center justify-center gap-2 text-sm text-white/50 mb-6">
                <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                  <Home className="w-4 h-4" />Home
                </Link>
                <span>/</span>
                <span className="text-white/80">Projects</span>
                {city && <><span>/</span><span className="text-white">{city}</span></>}
              </div>

              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                              bg-white/10 border border-white/20 text-sm font-semibold
                              text-[#4dd6f5] mb-6 backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4" />
                Pakistan&apos;s Most Trusted Real Estate Platform
              </div>

              {/* Headline — dynamic based on city filter */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight">
                {city ? (
                  <>
                    Projects in{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#029bba] to-[#4dd6f5]">
                      {city}
                    </span>
                  </>
                ) : (
                  <>
                    Explore Verified{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#029bba] to-[#4dd6f5]">
                      Projects in Pakistan
                    </span>
                  </>
                )}
              </h1>
              {/* Stunning subheading with trust signals */}
              <div className="max-w-3xl mx-auto mb-10">
                <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-5 font-light">
                  {city ? (
                    <>
                      <span className="font-bold text-white">
                        {totalCount > 0 ? `${totalCount.toLocaleString()}+ verified projects` : 'Verified projects'}
                      </span>
                      {' '}waiting for you in{' '}
                      <span className="font-bold text-[#4dd6f5]">{city}</span>.
                      {' '}Pehli eent se aakhri mirror tak — sab kuch verified.
                    </>
                  ) : (
                    <>
                      Pakistan ka <span className="font-bold text-[#4dd6f5]">sabse trusted</span>{' '}
                      real estate platform. Har project verified, har developer approved,{' '}
                      <span className="font-bold text-white">zero fake listings</span>.
                    </>
                  )}
                </p>

                {/* Trust chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                   bg-emerald-500/10 border border-emerald-500/30
                                   text-emerald-300 text-xs md:text-sm font-semibold
                                   backdrop-blur-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    NOC Verified
                  </span>
                  <span className="hidden sm:inline text-white/20">•</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                   bg-[#029bba]/10 border border-[#029bba]/30
                                   text-[#4dd6f5] text-xs md:text-sm font-semibold
                                   backdrop-blur-sm">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Approved Developers
                  </span>
                  <span className="hidden sm:inline text-white/20">•</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                   bg-amber-500/10 border border-amber-500/30
                                   text-amber-300 text-xs md:text-sm font-semibold
                                   backdrop-blur-sm">
                    <Shield className="w-3.5 h-3.5" />
                    Zero Fake Listings
                  </span>
                  <span className="hidden sm:inline text-white/20">•</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                   bg-purple-500/10 border border-purple-500/30
                                   text-purple-300 text-xs md:text-sm font-semibold
                                   backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    100% Transparent
                  </span>
                </div>
              </div>

              {/* Search bar */}
              <div className="max-w-4xl mx-auto">
                <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl
                                border border-white/10 p-4 md:p-6 shadow-2xl">
                  {/* Search row */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2
                                         w-5 h-5 text-gray-400 pointer-events-none" />
                      <input type="text"
                        placeholder="Search by project name, developer, or area..."
                        className="block w-full h-14 pl-12 pr-4 bg-white rounded-xl
                                   text-gray-900 placeholder-gray-400 border-0
                                   focus:ring-2 focus:ring-[#029bba] transition-all text-base"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => void fetchProjects({ resetPage: true })}
                      className="h-14 bg-gradient-to-r from-[#029bba] to-[#017a94]
                                 hover:from-[#02a8c9] hover:to-[#018a9a] text-white
                                 px-8 rounded-xl font-bold transition-all shadow-lg
                                 shadow-[#029bba]/30 flex items-center justify-center
                                 gap-2 whitespace-nowrap">
                      <Search className="w-5 h-5" />Search Projects
                    </button>
                  </div>

                  {/* Filter row */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* City */}
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                      <select value={city} onChange={e => setCity(e.target.value)}
                        className="w-full h-12 pl-9 pr-3 bg-white border border-gray-200
                                   rounded-xl text-gray-700 text-sm focus:ring-2
                                   focus:ring-[#029bba] appearance-none cursor-pointer">
                        <option value="">All Cities</option>
                        {PAKISTAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Category */}
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2
                                             w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                      <select value={projectCategory} onChange={e => setProjectCategory(e.target.value)}
                        className="w-full h-12 pl-9 pr-3 bg-white border border-gray-200
                                   rounded-xl text-gray-700 text-sm focus:ring-2
                                   focus:ring-[#029bba] appearance-none cursor-pointer">
                        <option value="">All Categories</option>
                        {CATEGORY_CONFIG.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>

                    {/* Nature */}
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2
                                          w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                      <select value={projectNature} onChange={e => setProjectNature(e.target.value)}
                        className="w-full h-12 pl-9 pr-3 bg-white border border-gray-200
                                   rounded-xl text-gray-700 text-sm focus:ring-2
                                   focus:ring-[#029bba] appearance-none cursor-pointer">
                        <option value="">All Types</option>
                        {NATURE_CONFIG.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
                      </select>
                    </div>

                    {/* Budget */}
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2
                                            w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                      <select value={budgetTier} onChange={e => setBudgetTier(e.target.value)}
                        className="w-full h-12 pl-9 pr-3 bg-white border border-gray-200
                                   rounded-xl text-gray-700 text-sm focus:ring-2
                                   focus:ring-[#029bba] appearance-none cursor-pointer">
                        <option value="">Any Budget</option>
                        {BUDGET_TIERS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats bar */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {[
                  { icon: Building2,   value: platformStats.totalProjects.toLocaleString(),   label: 'Verified Projects' },
                  { icon: Users,       value: platformStats.totalDevelopers.toLocaleString(),  label: 'Trusted Developers' },
                  { icon: MapPin,      value: platformStats.totalCities.toLocaleString(),      label: 'Cities Covered' },
                  { icon: ShieldCheck, value: platformStats.totalVerified.toLocaleString(),    label: 'Verified Listings' },
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-[#4dd6f5]" />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-black text-white">{stat.value}</p>
                      <p className="text-[11px] text-white/50 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Tab Navigation removed in Patch 10 Step 7
            Reason: Duplicated main site navigation
            "Top Builders" section below already handles that content
            "Properties" is accessible via main site nav
            Result: Cleaner page flow, direct to Discovery content */}

        {/* ══════════════════════════════════════
            DISCOVERY TABS — Explore Projects
            Moved here in Patch C for instant content discovery
        ══════════════════════════════════════ */}
        <DiscoveryTabsSection city={city} />
        {/* ══════════════════════════════════════
            QUICK FILTERS + SORT
        ══════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-500 mr-1">Quick:</span>
                {QUICK_FILTERS.map(qf => (
                  <button key={qf.key} onClick={() => toggleQuickFilter(qf.key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      quickFilters[qf.key]
                        ? 'bg-[#029bba] text-white border-[#029bba] shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#029bba]/40 hover:text-[#029bba]'
                    }`}>
                    {qf.label}
                  </button>
                ))}
                {hasActiveFilters && (
                  <button onClick={clearAllFilters}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm
                               text-red-500 hover:bg-red-50 border border-red-100 transition-all font-medium">
                    <X className="w-3.5 h-3.5" />Clear All
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden sm:block">
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-[#029bba] border-t-transparent
                                       rounded-full animate-spin inline-block" />
                      Loading...
                    </span>
                  ) : (
                    <span><strong className="text-gray-900">{totalCount.toLocaleString()}</strong> projects</span>
                  )}
                </span>
                <div className="relative">
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="h-9 pl-3 pr-8 bg-white border border-gray-200 rounded-xl
                               text-sm text-gray-700 font-medium focus:ring-2
                               focus:ring-[#029bba] appearance-none cursor-pointer">
                    {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2
                                          w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Old duplicate filter tags removed in Patch 10 Step 6
                Filter status now shown in the premium banner above project grid */}
          </div>
        </div>

        {/* ══════════════════════════════════════
            🔥 TRENDING PROJECTS — Section Header
        ══════════════════════════════════════ */}
        {projects.length > 0 && (
          <div className="bg-gradient-to-b from-gray-50 to-white pt-14 pb-6 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 text-center">
              {/* Accent lines with badge */}
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="h-px w-8 bg-orange-500" />
                <span className="inline-flex items-center gap-1.5 text-xs font-black
                                 text-orange-600 uppercase tracking-[0.2em]">
                  <Flame className="w-3.5 h-3.5" />
                  Hot Right Now
                </span>
                <span className="h-px w-8 bg-orange-500" />
              </div>
              {/* Headline */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-3 tracking-tight leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  Trending
                </span>{' '}
                Projects
                {city && (
                  <span className="block text-lg md:text-xl font-semibold text-gray-500 mt-2">
                    Most viewed in {city} this week
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                {city
                  ? `Handpicked projects generating buzz in ${city}. Buyers are moving fast — don't miss out.`
                  : 'Projects everyone is talking about. High-inquiry, high-demand — see what\u2019s catching attention.'
                }
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            FEATURED SHOWCASE — always shows
            Priority: isFeatured → verified → newest
        ══════════════════════════════════════ */}
        {(() => {
          // Priority 1: Featured projects
          const featured = projects.filter(p => p.isFeatured);
          if (featured.length > 0) {
            return <FeaturedShowcase projects={featured.slice(0, 5)} city={city} />;
          }
          // Priority 2: Top-scored verified projects
          const topVerified = projects
            .filter(p => p.isVerified && (p.highriseScore ?? 0) >= 70)
            .slice(0, 5);
          if (topVerified.length > 0) {
            return <FeaturedShowcase projects={topVerified} city={city} />;
          }
          // Priority 3: Latest verified projects (fallback)
          const latestVerified = projects
            .filter(p => p.isVerified)
            .slice(0, 5);
          if (latestVerified.length > 0) {
            return <FeaturedShowcase projects={latestVerified} city={city} />;
          }
          return null;
        })()}

{/* ══════════════════════════════════════
            HOTSPOT AREA CARDS
        ══════════════════════════════════════ */}
        <div className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-bold text-[#029bba] uppercase tracking-widest mb-2">
                  Top Localities
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                  Explore Hotspot Areas
                  {city && (
                    <span className="text-[#029bba]"> in {city}</span>
                  )}
                </h2>
                <p className="text-gray-500 mt-1 text-sm">
                  Most active localities with verified projects
                </p>
              </div>
              {/* City switcher — dynamic top cities from actual data */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 mr-1">Filter:</span>
                {(() => {
                  // Get top 6 cities by project count (data-driven)
                  const topCities = cityCounts
                    .slice(0, 6)
                    .map(c => c.city)
                    .filter(Boolean);

                  // Fallback: if no data yet, show major Pakistani cities
                  const fallbackCities = ['Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Multan', 'Peshawar'];
                  const citiesToShow = topCities.length > 0 ? topCities : fallbackCities;

                  return citiesToShow.map(c => {
                    const cityData = cityCounts.find(cc => cc.city === c);
                    const count = cityData?.count ?? 0;
                    return (
                      <button key={c}
                        onClick={() => applyCityFilter(c, false)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                   text-sm font-semibold transition-all ${
                          activeHotspotCity === c
                            ? 'bg-[#029bba] text-white shadow-md scale-105'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-[#029bba]/40 hover:text-[#029bba]'
                        }`}>
                        {c}
                        {count > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            activeHotspotCity === c
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
                {city && (
                  <button onClick={() => { setActiveHotspotCity('Islamabad'); setCity(''); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs
                               font-semibold text-red-500 hover:bg-red-50
                               border border-red-100 transition-all">
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Hotspot Cards Grid */}
            {cityHotspots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {cityHotspots.slice(0, 10).map((spot, idx) => {
                  const gradients = [
                    'from-[#029bba] to-[#017a94]',
                    'from-purple-500 to-purple-600',
                    'from-emerald-500 to-emerald-600',
                    'from-amber-500 to-amber-600',
                    'from-indigo-500 to-indigo-600',
                    'from-rose-500 to-rose-600',
                    'from-teal-500 to-teal-600',
                    'from-blue-500 to-blue-600',
                    'from-orange-500 to-orange-600',
                    'from-green-500 to-green-600',
                  ];
                  const gradient = gradients[idx % gradients.length] ?? 'from-[#029bba] to-[#017a94]';
                  const verifiedPct = spot.projectCount > 0
                    ? Math.round((spot.verifiedCount / spot.projectCount) * 100)
                    : 0;

                  // Selected state: this card matches current active filter
                  const isSelected = city === spot.city && searchQuery === spot.area;

                  return (
                    <button key={idx}
                      onClick={() => {
                        // Toggle: click again to deselect
                        if (isSelected) {
                          setCity('');
                          setSearchQuery('');
                        } else {
                          setCity(spot.city);
                          setSearchQuery(spot.area);
                          setTimeout(() => {
                            projectGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 200);
                        }
                      }}
                      className={`group relative bg-white rounded-2xl border-2 overflow-hidden text-left
                                 transition-all duration-300 hover:-translate-y-1 ${
                        isSelected
                          ? 'border-[#029bba] shadow-xl shadow-[#029bba]/20 scale-[1.02] ring-2 ring-[#029bba]/20'
                          : 'border-gray-200 hover:border-[#029bba]/40 hover:shadow-xl'
                      }`}>

                      {/* Selected checkmark badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full
                                        bg-[#029bba] border-2 border-white shadow-lg
                                        flex items-center justify-center animate-in fade-in duration-200">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* Gradient accent top bar — teal when selected */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${
                        isSelected ? 'from-[#029bba] to-[#4dd6f5]' : gradient
                      }`} />

                      <div className={`p-4 ${isSelected ? 'bg-gradient-to-b from-[#029bba]/5 to-transparent' : ''}`}>
                        {/* Icon + city label */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md
                                          group-hover:scale-110 transition-transform duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#029bba] to-[#017a94]'
                              : `bg-gradient-to-br ${gradient}`
                          }`}>
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                            isSelected
                              ? 'bg-[#029bba]/10 text-[#029bba]'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {spot.city}
                          </span>
                        </div>

                        <h3 className={`font-black text-sm leading-tight mb-1 line-clamp-2 transition-colors ${
                          isSelected ? 'text-[#029bba]' : 'text-gray-900 group-hover:text-[#029bba]'
                        }`}>
                          {spot.area}
                        </h3>

                        {/* Project count */}
                        <div className="flex items-center gap-1 mb-3">
                          <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-[#029bba]' : 'text-gray-400'}`} />
                          <span className={`text-xs font-medium ${isSelected ? 'text-[#029bba]' : 'text-gray-500'}`}>
                            {spot.projectCount} Project{spot.projectCount !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Verified bar */}
                        {spot.verifiedCount > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-400 font-medium">Verified</span>
                              <span className="text-[10px] font-bold text-emerald-600">
                                {verifiedPct}%
                              </span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${verifiedPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* CTA — always visible on selected, hover on others */}
                        <div className={`flex items-center gap-1 mt-3 text-[#029bba] font-bold text-xs transition-opacity duration-200 ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selected — Click to deselect</span>
                            </>
                          ) : (
                            <>
                              <span>Explore Area</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center
                                justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">No hotspot data yet</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Hotspot areas for{' '}
                  <span className="font-semibold text-gray-700">{activeHotspotCity}</span>
                  {' '}will appear as projects are added.
                </p>
                <button
                  onClick={() => applyCityFilter(activeHotspotCity, true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#029bba]
                             text-white text-sm font-bold rounded-xl hover:bg-[#017a94]
                             transition-colors shadow-lg shadow-[#029bba]/20">
                  Browse All Projects in {activeHotspotCity}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Tab Navigation moved to right after Hero section in Patch 10
            Reason: Standard pattern — global page nav belongs at top */}

        {/* Trending Carousel section removed in Patch 10
            Reason: Duplicate of Discovery tabs "High Demand"
            Discovery tabs now serve as the single trending source */}

        {/* ══════════════════════════════════════
            MAIN PROJECT LISTINGS
        ══════════════════════════════════════ */}
        <div ref={projectGridRef} className="bg-gray-50 py-10 scroll-mt-4">
          <div className="max-w-7xl mx-auto px-4">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#029bba]" />
                  {loading
                    ? 'Loading Projects...'
                    : hasActiveFilters
                      ? `${totalCount.toLocaleString()} Project${totalCount !== 1 ? 's' : ''} Match Your Filters`
                      : `${totalCount.toLocaleString()} Verified Project${totalCount !== 1 ? 's' : ''} Available`
                  }
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {loading
                    ? 'Fetching latest listings...'
                    : hasActiveFilters
                      ? 'Refine or clear filters to see more results'
                      : 'Browse verified projects from trusted developers across Pakistan'
                  }
                </p>
              </div>
            </div>

            {/* ── ACTIVE FILTERS BANNER ─────── */}
            {hasActiveFilters && !loading && (
              <div className="mb-6 bg-white rounded-2xl border border-[#029bba]/20
                              shadow-sm p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                  {/* Left: Active filter chips */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#029bba]/10 flex items-center justify-center flex-shrink-0">
                        <Search className="w-3 h-3 text-[#029bba]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        Active Filters
                      </span>
                      <span className="px-2 py-0.5 bg-[#029bba]/10 text-[#029bba]
                                       rounded-full text-[10px] font-black">
                        {[
                          searchQuery,
                          city,
                          projectCategory,
                          projectNature,
                          budgetTier,
                          ...Object.entries(quickFilters).filter(([, v]) => v).map(([k]) => k)
                        ].filter(Boolean).length}
                      </span>
                    </div>

                    {/* Filter chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      {searchQuery && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-[#029bba]/10 border border-[#029bba]/20
                                         rounded-full text-xs font-semibold text-[#029bba]
                                         hover:bg-[#029bba]/15 transition-colors">
                          <Search className="w-3 h-3" />
                          &ldquo;{searchQuery}&rdquo;
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Remove search filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {city && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-[#029bba]/10 border border-[#029bba]/20
                                         rounded-full text-xs font-semibold text-[#029bba]
                                         hover:bg-[#029bba]/15 transition-colors">
                          <MapPin className="w-3 h-3" />
                          {city}
                          <button
                            type="button"
                            onClick={() => setCity('')}
                            aria-label="Remove city filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {projectCategory && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-purple-50 border border-purple-200
                                         rounded-full text-xs font-semibold text-purple-700
                                         hover:bg-purple-100 transition-colors">
                          <Building2 className="w-3 h-3" />
                          {CATEGORY_CONFIG.find(c => c.key === projectCategory)?.label ?? projectCategory}
                          <button
                            type="button"
                            onClick={() => setProjectCategory('')}
                            aria-label="Remove category filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {projectNature && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-emerald-50 border border-emerald-200
                                         rounded-full text-xs font-semibold text-emerald-700
                                         hover:bg-emerald-100 transition-colors">
                          <Layers className="w-3 h-3" />
                          {NATURE_CONFIG.find(n => n.key === projectNature)?.label ?? projectNature}
                          <button
                            type="button"
                            onClick={() => setProjectNature('')}
                            aria-label="Remove nature filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {budgetTier && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-amber-50 border border-amber-200
                                         rounded-full text-xs font-semibold text-amber-700
                                         hover:bg-amber-100 transition-colors">
                          <Banknote className="w-3 h-3" />
                          {BUDGET_TIERS.find(b => b.key === budgetTier)?.label ?? budgetTier}
                          <button
                            type="button"
                            onClick={() => setBudgetTier('')}
                            aria-label="Remove budget filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {quickFilters.trusted && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-green-50 border border-green-200
                                         rounded-full text-xs font-semibold text-green-700
                                         hover:bg-green-100 transition-colors">
                          <ShieldCheck className="w-3 h-3" />
                          Trusted Only
                          <button
                            type="button"
                            onClick={() => toggleQuickFilter('trusted')}
                            aria-label="Remove trusted filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {quickFilters.featured && (
                        <span className="group inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5
                                         bg-orange-50 border border-orange-200
                                         rounded-full text-xs font-semibold text-orange-700
                                         hover:bg-orange-100 transition-colors">
                          <Flame className="w-3 h-3" />
                          Hot Deals
                          <button
                            type="button"
                            onClick={() => toggleQuickFilter('featured')}
                            aria-label="Remove hot deals filter"
                            className="w-5 h-5 rounded-full bg-white/60 hover:bg-red-500
                                       hover:text-white flex items-center justify-center
                                       transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Clear All button */}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 self-start
                               bg-red-500 hover:bg-red-600 text-white font-bold text-xs
                               rounded-xl transition-all shadow-md shadow-red-500/20
                               hover:shadow-lg hover:shadow-red-500/30 whitespace-nowrap
                               flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                    Clear All Filters
                  </button>
                </div>

                {/* Bottom: Result summary */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${totalCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <p className="text-xs text-gray-600">
                    {totalCount > 0 ? (
                      <>
                        <span className="font-bold text-gray-900">{totalCount.toLocaleString()}</span>
                        {' '}project{totalCount !== 1 ? 's' : ''} match your filters
                      </>
                    ) : (
                      <span className="text-amber-700 font-semibold">
                        No projects match all filters — try removing some
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                    <div className="h-52 bg-gray-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
                      <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button onClick={() => void fetchProjects({ resetPage: true })}
                  className="px-6 py-2.5 bg-[#029bba] text-white rounded-xl font-semibold
                             hover:bg-[#027a94] transition-colors">
                  Try Again
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && projects.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Try adjusting your search or filters.
                </p>
                <button onClick={() => { clearAllFilters(); void fetchProjects({ resetPage: true }); }}
                  className="px-6 py-3 bg-[#029bba] text-white rounded-xl font-bold
                             hover:bg-[#027a94] transition-colors shadow-lg shadow-[#029bba]/20">
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Cards */}
            {!loading && !error && projects.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(project => (
                    <ProjectCardEnhanced key={project._id} project={project} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
                                 text-gray-700 hover:bg-gray-50 disabled:opacity-40
                                 disabled:cursor-not-allowed transition-colors">
                      Previous
                    </button>
                    {(() => {
                      const pages: number[] = [];
                      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
                      return pages.map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                            p === page
                              ? 'bg-[#029bba] text-white shadow-lg shadow-[#029bba]/20'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}>
                          {p}
                        </button>
                      ));
                    })()}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
                                 text-gray-700 hover:bg-gray-50 disabled:opacity-40
                                 disabled:cursor-not-allowed transition-colors">
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════
            BLOG INSIGHTS
        ══════════════════════════════════════ */}
        <BlogInsightsSection />

        {/* Browse by City section removed in Patch 10
            Reason: Duplicate of Hotspot Areas section
            Hotspot Areas + city switcher pills handle city discovery
            SEO footer still has "Projects by City" links for SEO */}

        {/* ══════════════════════════════════════
            TRUSTED DEVELOPERS
        ══════════════════════════════════════ */}
        <TrustedDevelopersSection city={city} />

        {/* ══════════════════════════════════════
            WHY HIGHRISE
        ══════════════════════════════════════ */}
        <div className="bg-gradient-to-b from-gray-50 to-white py-16 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
                Why Choose Highrise.pk?
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Building Pakistan&apos;s most trusted real estate platform —
                every feature designed to protect your investment
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {WHY_HIGHRISE.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx}
                    className="bg-white rounded-2xl border border-gray-200 p-6
                               hover:shadow-lg hover:border-[#029bba]/20
                               transition-all duration-300 hover:-translate-y-1 group">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color}
                                    flex items-center justify-center mb-4 shadow-lg
                                    group-hover:scale-110 transition-transform duration-300`}>
                      <ItemIcon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            DISCLAIMER
        ══════════════════════════════════════ */}
        <div className="bg-amber-50 border-t border-amber-100">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">Important Disclaimer</p>
                <p className="text-sm text-amber-700">
                  Highrise.pk verifies project details to the best of our ability. We strongly recommend
                  visiting the project site, verifying all documents independently, and consulting
                  legal counsel before any financial commitment. Verification on Highrise.pk does not
                  constitute a guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            SEO FOOTER
        ══════════════════════════════════════ */}
        <div className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-lg font-bold text-white mb-8">Browse Projects on Highrise.pk</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
              <div>
                <h3 className="font-bold text-white mb-4 text-base">Projects by City</h3>
                <ul className="space-y-2">
                  {['Islamabad','Lahore','Karachi','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta'].map(c => (
                    <li key={c}>
                      <Link href={`/projects?city=${encodeURIComponent(c)}`}
                        className="hover:text-[#029bba] transition-colors">
                        Projects in {c}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white mb-4 text-base">Projects by Category</h3>
                <ul className="space-y-2">
                  {CATEGORY_CONFIG.map(cat => (
                    <li key={cat.key}>
                      <Link href={`/projects?projectCategory=${cat.key}`}
                        className="hover:text-[#029bba] transition-colors">
                        {cat.label} Projects
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white mb-4 text-base">Projects by Budget</h3>
                <ul className="space-y-2">
                  {BUDGET_TIERS.map(b => (
                    <li key={b.key}>
                      <Link href={`/projects?budgetTier=${b.key}`}
                        className="hover:text-[#029bba] transition-colors">
                        Projects {b.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <h3 className="font-bold text-white mb-4 mt-6 text-base">By Type</h3>
                <ul className="space-y-2">
                  {NATURE_CONFIG.map(n => (
                    <li key={n.key}>
                      <Link href={`/projects?projectNature=${n.key}`}
                        className="hover:text-[#029bba] transition-colors">
                        {n.label} Projects
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white mb-4 text-base">Tools & Resources</h3>
                <ul className="space-y-2">
                  {[
                    { label: 'Tax Calculator',    href: '/tools/tax-calculator' },
                    { label: 'EMI Calculator',    href: '/tools/emi-calculator' },
                    { label: 'Area Converter',    href: '/tools/area-converter' },
                    { label: 'ROI Calculator',    href: '/tools/roi-calculator' },
                  ].map(tool => (
                    <li key={tool.label}>
                      <Link href={tool.href} className="hover:text-[#029bba] transition-colors">
                        {tool.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <h3 className="font-bold text-white mb-4 mt-6 text-base">Popular Areas</h3>
                <ul className="space-y-2">
                  {['DHA Islamabad','Bahria Town','Blue Area','Gulberg Greens','B-17 Islamabad'].map(area => (
                    <li key={area}>
                      <Link href={`/projects?search=${encodeURIComponent(area)}`}
                        className="hover:text-[#029bba] transition-colors">
                        Projects in {area}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row
                            sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Highrise.pk — Pakistan&apos;s Most Trusted Real Estate Platform
              </p>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

// ============================================
// SERVER-SIDE DATA FETCHING
// ============================================

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { query, res } = ctx;

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const emptyProps: PageProps = {
    initialProjects: [],
    totalProjects: 0,
    totalPages: 1,
    hotspots: [],
    cityCounts: [],
    categoryCounts: [],
    platformStats: { totalProjects: 0, totalDevelopers: 0, totalCities: 0, totalVerified: 0 },
  };

  try {
    const dbConnect = (await import('@/lib/dbConnect')).default;
    await dbConnect();

    const Project          = (await import('@/models/Projects')).default;
    const DeveloperProfile = (await import('@/models/DeveloperProfile')).default;

    const cityParam     = typeof query.city            === 'string' ? query.city.trim()            : '';
    const categoryParam = typeof query.projectCategory === 'string' ? query.projectCategory.trim() : '';
    const natureParam   = typeof query.projectNature   === 'string' ? query.projectNature.trim()   : '';
    const budgetParam   = typeof query.budgetTier      === 'string' ? query.budgetTier.trim()       : '';
    const searchParam   = typeof query.search          === 'string' ? query.search.trim()           : '';
    const sortParam     = typeof query.sort            === 'string' ? query.sort.trim()             : 'newest';
    const pageParam     = typeof query.page            === 'string' ? parseInt(query.page, 10)      : 1;
    const page          = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit         = 12;
    const skip          = (page - 1) * limit;

    type FilterType = Record<string, unknown>;
    const filter: FilterType = {
      isDeleted: { $ne: true },
      status: 'verified',
      verificationStatus: 'verified',
      developerApprovalStatus: 'approved',
    };

    if (cityParam) {
      filter.city = { $regex: new RegExp(`^${cityParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }
    if (categoryParam) filter.projectCategory = categoryParam;
    if (natureParam)   filter.projectNature   = natureParam;

    if (searchParam) {
      const escaped = searchParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [{ projectName: rx }, { city: rx }, { area: rx }, { tagline: rx }];
    }

    const budgetRanges: Record<string, { min: number; max: number }> = {
      under_50L:  { min: 0,          max: 5_000_000 },
      '50L_to_1Cr': { min: 5_000_000,  max: 10_000_000 },
      '1Cr_to_3Cr': { min: 10_000_000, max: 30_000_000 },
      '3Cr_to_5Cr': { min: 30_000_000, max: 50_000_000 },
      above_5Cr:  { min: 50_000_000, max: Number.MAX_SAFE_INTEGER },
    };

    if (budgetParam && budgetRanges[budgetParam]) {
      const tier = budgetRanges[budgetParam];
      filter.$or = [
        { minPrice: { $gte: tier.min, $lte: tier.max } },
        { maxPrice: { $gte: tier.min, $lte: tier.max } },
      ];
    }

    type SortType = Record<string, 1 | -1>;
    const sortOptions: Record<string, SortType> = {
      newest:      { createdAt: -1, _id: -1 },
      oldest:      { createdAt: 1,  _id: 1  },
      price_asc:   { minPrice: 1,   _id: -1 },
      price_desc:  { maxPrice: -1,  _id: -1 },
      popularity:  { highriseScore: -1, createdAt: -1 },
      most_viewed: { views: -1,     createdAt: -1 },
    };
    const sort = sortOptions[sortParam] ?? sortOptions.newest;

    const projection = {
      _id: 1, slug: 1, projectName: 1, tagline: 1, shortDescription: 1,
      city: 1, area: 1, projectCategory: 1, projectNature: 1,
      projectStatus: 1, saleMode: 1, status: 1, verificationStatus: 1,
      isFeatured: 1, isVerified: 1, isTrustedBuilder: 1, developerBadge: 1,
      minPrice: 1, maxPrice: 1, priceRangeText: 1, highriseScore: 1,
      riskLevel: 1, deliveryStatus: 1, verificationLevel: 1,
      featureImageUrl: 1, 'images.url': 1, 'images.isPrimary': 1,
      'developerProfile.name': 1, 'developerProfile.logoUrl': 1,
      totalUnits: 1, unitsAvailable: 1, unitTypeBreakdown: 1,
      createdAt: 1, updatedAt: 1,
    };

    const [rawProjects, totalCount] = await Promise.all([
      Project.find(filter).select(projection).sort(sort).skip(skip).limit(limit).maxTimeMS(5000).lean(),
      Project.countDocuments(filter).maxTimeMS(3000),
    ]);

    const badgeLabels: Record<string, string> = {
      new_entrant: 'New Developer', emerging: 'Emerging Builder',
      trusted: 'Trusted Developer', premium: 'Premium Developer',
    };
    const badgeEmojis: Record<string, string> = {
      new_entrant: '🆕', emerging: '⭐', trusted: '🏆', premium: '💎',
    };

    // Helper: convert undefined to null for Next.js serialization
    const nullify = <T,>(val: T | undefined): T | null => (val === undefined ? null : val);

    const initialProjects: ProjectCard[] = (rawProjects as Record<string, unknown>[]).map(p => {
      let primaryImage: string | null = null;
      if (typeof p.featureImageUrl === 'string') {
        primaryImage = p.featureImageUrl;
      } else if (Array.isArray(p.images) && p.images.length > 0) {
        const imgs = p.images as Array<{ url?: string; isPrimary?: boolean }>;
        const primary = imgs.find(img => img?.isPrimary);
        primaryImage = primary?.url ?? imgs[0]?.url ?? null;
      }

      const devProfile = p.developerProfile as { name?: string; logoUrl?: string } | undefined;
      const badge = typeof p.developerBadge === 'string' ? p.developerBadge : '';

      // Deep-clean: replace all undefined with null (Next.js requirement)
      const card = {
        _id:                    String(p._id ?? ''),
        slug:                   String(p.slug ?? ''),
        projectName:            String(p.projectName ?? ''),
        tagline:                typeof p.tagline === 'string' ? p.tagline : null,
        shortDescription:       typeof p.shortDescription === 'string' ? p.shortDescription : null,
        city:                   String(p.city ?? ''),
        area:                   String(p.area ?? ''),
        projectCategory:        String(p.projectCategory ?? ''),
        projectNature:          String(p.projectNature ?? ''),
        projectStatus:          String(p.projectStatus ?? ''),
        saleMode:               typeof p.saleMode === 'string' ? p.saleMode : null,
        status:                 String(p.status ?? ''),
        verificationStatus:     String(p.verificationStatus ?? ''),
        isFeatured:             Boolean(p.isFeatured),
        isVerified:             Boolean(p.isVerified),
        isTrustedBuilder:       Boolean(p.isTrustedBuilder),
        developerBadge:         badge || null,
        badgeLabel:             badge ? badgeLabels[badge] || null : null,
        badgeEmoji:             badge ? badgeEmojis[badge] || null : null,
        minPrice:               typeof p.minPrice === 'number' ? p.minPrice : null,
        maxPrice:               typeof p.maxPrice === 'number' ? p.maxPrice : null,
        priceRangeText:         typeof p.priceRangeText === 'string' ? p.priceRangeText : null,
        startingPriceFormatted: null,
        highriseScore:          typeof p.highriseScore === 'number' ? p.highriseScore : null,
        riskLevel:              typeof p.riskLevel === 'string' ? p.riskLevel : null,
        deliveryStatus:         typeof p.deliveryStatus === 'string' ? p.deliveryStatus : null,
        verificationLevel:      typeof p.verificationLevel === 'string' ? p.verificationLevel : null,
        primaryImage,
        featureImageUrl:        typeof p.featureImageUrl === 'string' ? p.featureImageUrl : null,
        developerId:            '',
        developerName:          devProfile?.name ?? '',
        developerLogoUrl:       devProfile?.logoUrl ?? null,
        unitTypesCount:         Array.isArray(p.unitTypeBreakdown) ? p.unitTypeBreakdown.length : 0,
        totalUnits:             typeof p.totalUnits === 'number' ? p.totalUnits : null,
        unitsAvailable:         typeof p.unitsAvailable === 'number' ? p.unitsAvailable : null,
        createdAt:              p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? ''),
        updatedAt:              p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt ?? ''),
      };

      // Suppress unused var warning
      void nullify;

      return card as ProjectCard;
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const [hotspotsRaw, cityCountsRaw, categoryCountsRaw,
           totalVerified, totalDevelopers] = await Promise.all([
      Project.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'verified', verificationStatus: 'verified' } },
        { $group: { _id: { city: '$city', area: '$area' }, projectCount: { $sum: 1 }, verifiedCount: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } } } },
        { $sort: { projectCount: -1 } },
        { $limit: 50 },
      ]).option({ maxTimeMS: 3000 }),

      Project.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'verified' } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).option({ maxTimeMS: 3000 }),

      Project.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'verified' } },
        { $group: { _id: '$projectCategory', count: { $sum: 1 } } },
      ]).option({ maxTimeMS: 3000 }),

      Project.countDocuments({ isDeleted: { $ne: true }, status: 'verified', isVerified: true }).maxTimeMS(2000),
      DeveloperProfile.countDocuments({ isDeleted: { $ne: true }, status: 'approved' }).maxTimeMS(2000),
    ]);

    const hotspots: HotspotArea[] = (hotspotsRaw as Array<{ _id: { city: string; area: string }; projectCount: number; verifiedCount: number }>).map(h => ({
      area: String(h._id?.area ?? ''),
      city: String(h._id?.city ?? ''),
      projectCount: Number(h.projectCount ?? 0),
      verifiedCount: Number(h.verifiedCount ?? 0),
    }));

    const cityCounts = (cityCountsRaw as Array<{ _id: string; count: number }>).map(c => ({
      city: String(c._id ?? ''),
      count: Number(c.count ?? 0),
    }));

    const categoryCounts = (categoryCountsRaw as Array<{ _id: string; count: number }>).map(c => ({
      category: String(c._id ?? ''),
      count: Number(c.count ?? 0),
    }));

    return {
      props: {
        initialProjects,
        totalProjects: totalCount,
        totalPages,
        hotspots,
        cityCounts,
        categoryCounts,
        platformStats: {
          totalProjects: totalCount,
          totalDevelopers,
          totalCities: cityCounts.length,
          totalVerified,
        },
      },
    };
  } catch {
    return { props: emptyProps };
  }
};