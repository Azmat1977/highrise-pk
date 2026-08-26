// pages/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import {
  Search, MapPin, Home, Building2, TrendingUp, Shield,
  Users, ChevronRight, ChevronDown, ChevronUp, Star,
  Heart, Eye, Send, X, Sparkles, ArrowRight,
  CheckCircle, Mail, Clock, Award, Loader2, BedDouble,
  Bath, Maximize, KeyRound, DollarSign, BadgeDollarSign,
  Calendar, Newspaper, Banknote, Landmark, LayoutDashboard,
  TreePine, Store, Warehouse, Factory, FileText, Grid3X3,
  BadgeCheck, Crown, Zap, ShieldCheck, AlertTriangle,
  Calculator, TrendingDown, Activity, Building, Info,
  BarChart3, Check,
} from 'lucide-react';

import { useCompare } from '@/hooks/useCompare';

// ─── Types ────────────────────────────────────────────────────────────────────
function toIdString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);

  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;

    // Mongo Extended JSON: { $oid: "..." }
    const oid = obj.$oid;
    if (typeof oid === 'string' && oid.trim()) return oid.trim();

    // Common nested patterns
    if (obj._id && obj._id !== v) {
      const nested = toIdString(obj._id);
      if (nested) return nested;
    }
    if (obj.id && obj.id !== v) {
      const nested = toIdString(obj.id);
      if (nested) return nested;
    }

    // Mongoose ObjectId
    const toHexString = (v as { toHexString?: () => unknown }).toHexString;
    if (typeof toHexString === 'function') {
      try {
        const resolved = toHexString.call(v);
        if (typeof resolved === 'string' && resolved.trim()) return resolved.trim();
      } catch {}
    }

    const toStringFn = (v as { toString?: () => unknown }).toString;
    if (typeof toStringFn === 'function') {
      try {
        const str = toStringFn.call(v);
        if (typeof str === 'string' && str.trim() && str.trim() !== '[object Object]') {
          return str.trim();
        }
      } catch {}
    }
  }

  return '';
}
interface PropertyItem {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  listingType: string;
  propertyType: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: { url: string }[];
  city?: string;
  society?: string;
  area?: string;
  areaUnit?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  monthlyInstallment?: number;
  installmentYears?: number;
  downPaymentPercentage?: number;
}

interface ProjectItem {
  _id: string;
  projectName: string;
  slug?: string;
  city?: string;
  areaName?: string;
  projectStatus?: string;
  projectCategory?: string;
  projectNature?: string;
  startingPrice?: number;
  possessionDate?: string;
  coverImage?: { url: string };
  images?: { url: string }[];
}

interface DeveloperItem {
  _id: string;
  companyName: string;
  slug?: string;
  developerType?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  completedProjectsCount?: number;
  activeProjectsCount?: number;
  establishedYear?: number;
  isVerified?: boolean;
  logo?: { url: string };
}

interface BlogItem {
  _id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  publishedAt?: string;
  createdAt?: string;
  image?: { url: string };
}

interface CityItem {
  name: string;
  propertyCount?: number;
  imageUrl?: string;
  image?: string;
  isActive?: boolean;
  isFeaturedOnHomepage?: boolean;
  displayOrder?: number;
}

interface PartnerItem {
  _id: string;
  companyName?: string;
  logo?: { url: string };
}

interface HeroBannerSlide {
  id: string | number;
  url: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  sponsorName?: string;
  isPaidPromotion?: boolean;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

// Society item for homepage featured section
interface SocietyItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  scores: {
    legal: number;
    growth: number;
    overall: number;
  };
  featuredImage?: string;
  activeAlertCount: number;
  isVerifiedByHighrise: boolean;
  developerName?: string;
}

// Risk alert types — matches UnifiedRiskAlert from /api/risk-alerts
interface RiskAlertItem {
  _id: string;
  society: string;
  city: string;
  message: string;
  authority: string;
  date: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'active' | 'resolved' | 'investigating';
  sourceType: 'society' | 'project';
  sourceSlug: string;
  sourceUrl?: string;
  issuedAt: string;
}

interface RiskAlertStats {
  activeCount: number;
  criticalCount: number;
  highCount: number;
  societyAlerts: number;
  projectAlerts: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const fallbackHeroImages: HeroBannerSlide[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80',
    title: '',
    subtitle: '',
  },
];

// Market pulse ticker items (static — replace with API later)
const MARKET_PULSE_ITEMS = [
  { label: '🏗️ Cement', value: 'Rs 1,250/bag', change: '+2%', up: true },
  { label: '⚙️ Saria', value: 'Rs 3,100/40kg', change: '-1%', up: false },
  { label: '🏠 Lahore 5M Avg', value: 'Rs 1.1 Crore', change: '+18% YoY', up: true },
  { label: '🏛️ ISB 10M Avg', value: 'Rs 2.8 Crore', change: '+12% YoY', up: true },
  { label: '🌆 Karachi Apt Avg', value: 'Rs 85 Lac', change: '+9% YoY', up: true },
  { label: '🔥 Hot Zone', value: 'Raiwind Road, LHR', change: '↑ Rising', up: true },
  { label: '⚠️ Risk Alert', value: '3 New Alerts Today', change: 'View All', up: false },
];

const propertyCategories = [
  {
    id: 'residential',
    name: 'Residential',
    icon: <Home className="w-5 h-5" />,
    subtypes: [
      { id: 'House', name: 'House', icon: <Home className="w-4 h-4" /> },
      { id: 'Apartment', name: 'Flat / Apartment', icon: <Building2 className="w-4 h-4" /> },
      { id: 'Upper Portion', name: 'Upper Portion', icon: <ChevronUp className="w-4 h-4" /> },
      { id: 'Lower Portion', name: 'Lower Portion', icon: <ChevronDown className="w-4 h-4" /> },
      { id: 'Farm House', name: 'Farm House', icon: <TreePine className="w-4 h-4" /> },
      { id: 'Room', name: 'Room', icon: <BedDouble className="w-4 h-4" /> },
      { id: 'Penthouse', name: 'Penthouse', icon: <Crown className="w-4 h-4" /> },
      { id: 'Villa', name: 'Villa', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    id: 'commercial',
    name: 'Commercial',
    icon: <Building2 className="w-5 h-5" />,
    subtypes: [
      { id: 'Office', name: 'Office', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'Shop', name: 'Shop', icon: <Store className="w-4 h-4" /> },
      { id: 'Warehouse', name: 'Warehouse', icon: <Warehouse className="w-4 h-4" /> },
      { id: 'Factory', name: 'Factory', icon: <Factory className="w-4 h-4" /> },
      { id: 'Building', name: 'Building', icon: <Building2 className="w-4 h-4" /> },
      { id: 'Plaza', name: 'Plaza', icon: <Building2 className="w-4 h-4" /> },
    ],
  },
  {
    id: 'plots',
    name: 'Plots',
    icon: <Maximize className="w-5 h-5" />,
    subtypes: [
      { id: 'Residential Plot', name: 'Residential Plot', icon: <Home className="w-4 h-4" /> },
      { id: 'Commercial Plot', name: 'Commercial Plot', icon: <Building2 className="w-4 h-4" /> },
      { id: 'Agricultural Land', name: 'Agricultural Land', icon: <TreePine className="w-4 h-4" /> },
      { id: 'Industrial Land', name: 'Industrial Land', icon: <Factory className="w-4 h-4" /> },
      { id: 'Plot File', name: 'Plot File', icon: <FileText className="w-4 h-4" /> },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPKR(price: number, listingType?: string): string {
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  return `PKR ${price.toLocaleString()}${suffix}`;
}

function getLocationLabel(p: PropertyItem): string {
  return [p.society, p.area, p.city].filter(Boolean).join(', ');
}

function getAreaLabel(p: PropertyItem): string {
  if (!p.area) return 'N/A';
  return `${p.area} ${p.areaUnit || 'Marla'}`;
}

function getPrimaryImageUrl(p: PropertyItem): string {
  return p.images?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';
}

function listingTypeLabel(type: string): string {
  const map: Record<string, string> = {
    full_payment: 'For Sale',
    installment: 'Installment',
    rent: 'For Rent',
    pre_launch: 'Pre-Launch',
  };
  return map[type] || type;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PropertyTypeDropdownProps {
  value: string;
  onChange: (value: string, category: string) => void;
  buttonHeight?: string;
}

function PropertyTypeDropdown({
  value,
  onChange,
  buttonHeight = 'h-[56px]',
}: PropertyTypeDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedLabel = (): string => {
    if (!value) return 'Property Type';
    for (const category of propertyCategories) {
      const subtype = category.subtypes.find((s) => s.id === value);
      if (subtype) return subtype.name;
    }
    return 'Property Type';
  };

  const activeCategory = propertyCategories.find((c) => c.id === expandedCategory);

  return (
    <div className="relative z-[160]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative z-[150] w-full ${buttonHeight} pl-12 pr-4 rounded-xl border border-transparent bg-white/90 text-slate-900 text-sm focus:bg-white focus:border-[#029bba] focus:ring-4 focus:ring-[#029bba]/10 outline-none text-left flex items-center justify-between transition-all`}
      >
        <span className={`block truncate pr-3 ${value ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {getSelectedLabel()}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[200] overflow-hidden transition-all duration-200" style={{ minWidth: '320px' }}>
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900 text-sm">Select Property Type</h4>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <div className="p-2 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                {propertyCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className={`px-3 py-3 rounded-xl text-center flex flex-col items-center justify-center gap-2 transition-all ${
                      expandedCategory === category.id
                        ? 'bg-[#029bba]/10 text-[#029bba] border border-[#029bba]/20'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      expandedCategory === category.id ? 'bg-[#029bba] text-white' : 'bg-white text-[#029bba] border border-slate-200'
                    }`}>
                      {category.icon}
                    </div>
                    <span className="text-xs font-semibold leading-tight">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeCategory && (
              <div className="overflow-hidden transition-all duration-200">
                <div className="p-2">
                  <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                    {activeCategory.name} Types
                  </div>
                  <div className="space-y-1">
                    {activeCategory.subtypes.map((subtype) => (
                      <button
                        key={subtype.id}
                        type="button"
                        onClick={() => { onChange(subtype.id, activeCategory.id); setIsOpen(false); }}
                        className={`w-full px-4 py-2.5 rounded-xl text-left text-sm flex items-center gap-3 transition-colors ${
                          value === subtype.id ? 'bg-[#029bba] text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={value === subtype.id ? 'text-white' : 'text-slate-400'}>{subtype.icon}</span>
                        <span className="flex-1 truncate">{subtype.name}</span>
                        {value === subtype.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Modal ─────────────────────────────────────────────────────────────

interface SubscriptionInlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'already_subscribed';
  message: string;
  email: string;
}

function SubscriptionInlineModal({ isOpen, onClose, type, message, email }: SubscriptionInlineModalProps): React.ReactElement | null {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-modal-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {type === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 id="sub-modal-title" className="text-xl font-bold text-gray-900 mb-2">You&apos;re Subscribed!</h3>
            <p className="text-gray-600">Thank you for subscribing. You&apos;ll receive our latest property insights.</p>
          </>
        )}

        {type === 'already_subscribed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#029bba]" />
            </div>
            <h3 id="sub-modal-title" className="text-xl font-bold text-gray-900 mb-2">Already Subscribed</h3>
            <p className="text-gray-600">{email} is already on our list. Thank you!</p>
          </>
        )}

        {type === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h3 id="sub-modal-title" className="text-xl font-bold text-gray-900 mb-2">Something Went Wrong</h3>
            <p className="text-gray-600">{message || 'Please try again.'}</p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-6 px-6 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Market Pulse Ticker ──────────────────────────────────────────────────────

function MarketPulseTicker(): React.ReactElement {
  return (
    <div className="w-full h-[48px] bg-[#001f2b] overflow-hidden flex items-center border-b border-white/10">
      {/* Static Label */}
      <div className="flex-shrink-0 h-full flex items-center px-4 bg-[#029bba] gap-2 z-10">
        <Activity className="w-3.5 h-3.5 text-white" />
        <span className="text-white text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Live Market</span>
      </div>

      {/* Scrolling Strip */}
      <div className="flex-1 overflow-hidden relative">
        <div className="flex animate-market-marquee gap-0">
          {/* Duplicate for seamless loop */}
          {[...MARKET_PULSE_ITEMS, ...MARKET_PULSE_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-6 border-r border-white/10 flex-shrink-0">
              <span className="text-white/60 text-xs whitespace-nowrap">{item.label}</span>
              <span className="text-white text-xs font-semibold whitespace-nowrap">{item.value}</span>
              <span className={`text-[11px] font-bold whitespace-nowrap ${item.up ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Intelligence Tool Cards ──────────────────────────────────────────────────

function IntelligenceToolCards(): React.ReactElement {
  const tools = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Verify Society / NOC',
      description: 'Check if a housing scheme is legally approved. See NOC status, authority, and risk alerts instantly.',
      href: '/tools/verify-society',
      color: 'from-[#029bba] to-[#004063]',
      stats: '500+ Societies',
      industryFirst: true,
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Fair Price Estimator',
      description: 'Is the asking price fair? Get a data-driven price estimate for any property in Pakistan.',
      href: '/tools/price-estimator',
      color: 'from-[#027a94] to-[#003553]',
      stats: 'Statistical Analysis',
      industryFirst: true,
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      title: 'Construction Calculator',
      description: 'Planning to build? Get cost estimates for 14 property types across 10 cities with live material rates.',
      href: '/tools/construction-calculator',
      color: 'from-[#004063] to-[#001f2b]',
      stats: '14 Property Types',
      industryFirst: true,
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      title: 'Home Loan Calculator',
      description: 'Compare 10 Pakistani banks side by side. Islamic (Diminishing Musharakah) + Conventional mortgages with full amortization.',
      href: '/tools/home-loan-calculator',
      color: 'from-[#029bba] to-[#003553]',
      stats: '10 Banks · Islamic + Conv.',
      industryFirst: true,
    },
    {
      icon: <Maximize className="w-6 h-6" />,
      title: 'Area Unit Converter',
      description: 'Convert Marla, Kanal, Sqft, Sqyd and 9 more units instantly. Includes 3 Marla standards used across Pakistan.',
      href: '/tools/area-unit-converter',
      color: 'from-[#06b6d4] to-[#029bba]',
      stats: '13 Units Supported',
      industryFirst: false,
      mostComprehensive: true,
    },
  ];

  return (
    <section className="py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Pakistan&apos;s First Property Intelligence Tools
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            <span className="text-[#029bba]">Smart Tools</span> for Smart Buyers
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don&apos;t rely on rumors or biased dealers. Use data to verify, estimate, and decide.
          </p>
        </div>

        {/* 5 Tools in responsive grid — 1 col mobile, 2 cols tablet, 3 cols desktop */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href}>
              <div className="group h-full bg-white rounded-2xl border border-gray-200 hover:border-[#029bba] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer flex flex-col">
                {/* Gradient header with icon */}
                <div className={`bg-gradient-to-br ${tool.color} p-5 relative overflow-hidden`}>
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-3">
                    {tool.icon}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2 min-h-[20px]">
                    {tool.industryFirst && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        Industry-First
                      </span>
                    )}
                    {tool.mostComprehensive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white">
                        <Award className="w-2.5 h-2.5" />
                        Most Comprehensive
                      </span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white leading-tight">{tool.title}</h3>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-gray-600 text-xs leading-relaxed mb-4 flex-1 line-clamp-3">{tool.description}</p>

                  {/* Stats + CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#029bba]">
                      {tool.stats}
                    </span>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-[#029bba] group-hover:gap-2 transition-all">
                      Try Free
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Tools CTA */}
        <div className="text-center mt-10">
          <Link href="/tools">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-[#029bba] text-[#029bba] font-semibold text-sm hover:bg-[#029bba] hover:text-white transition-all shadow-sm hover:shadow-md">
              <Sparkles className="w-4 h-4" />
              View All Tools (Including Coming Soon)
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <p className="text-xs text-gray-500 mt-3">
            🚀 More tools coming: Aria AI Bot · Investment ROI · Plot Finder
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Verified Societies Section (Hero + 4 Mini Cards) ────────────────────────

interface VerifiedSocietiesSectionProps {
  societies: SocietyItem[];
  loading: boolean;
}

function VerifiedSocietiesSection({
  societies,
  loading,
}: VerifiedSocietiesSectionProps): React.ReactElement {

  // NOC display helpers (inlined to avoid extra constant scope)
  const getNocLabel = (status: string): { text: string; bg: string } => {
    if (status === 'approved') return { text: 'NOC Approved', bg: 'bg-[#10b981]' };
    if (status === 'pending' || status === 'under_review') return { text: 'NOC Pending', bg: 'bg-[#f59e0b]' };
    if (status === 'illegal' || status === 'disputed' || status === 'cancelled') return { text: 'High Risk', bg: 'bg-[#ef4444]' };
    return { text: 'Under Review', bg: 'bg-[#f59e0b]' };
  };

  const getScoreColor = (s: number): string => {
    if (s >= 75) return 'text-[#10b981]';
    if (s >= 50) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const heroSociety = societies[0];
  const miniSocieties = societies.slice(1, 5);

  return (
    <section className="relative py-20 bg-gradient-to-br from-[#f8fcfd] via-[#eef7fa] to-[#e6f4f8] overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#029bba]/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#004063]/8 to-transparent blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #029bba 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#029bba]/20 shadow-sm mb-5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#004063]">
              Verified Societies
            </span>
            <span className="text-[10px] font-semibold text-[#029bba] bg-[#029bba]/10 px-2 py-0.5 rounded-full">
              Industry-First
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-[#001f2b] mb-4 leading-tight tracking-tight">
            Pakistan&apos;s Most{' '}
            <span className="text-[#029bba]">Trusted</span>{' '}
            Housing Societies
          </h2>

          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Every society scored on 6 dimensions — Legal, Growth, Infrastructure, Possession, Livability.
            <strong className="text-[#004063]"> No more guesswork.</strong>
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 animate-pulse">
              <div className="h-80 bg-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-200 animate-pulse">
                  <div className="h-32 bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && societies.length === 0 && (
          <div className="max-w-2xl mx-auto text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-[#001f2b] mb-2">Society Directory Launching Soon</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              We&apos;re onboarding verified societies across Pakistan with full intelligence scoring.
            </p>
            <Link href="/tools/verify-society">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                <Shield className="w-4 h-4" />
                Verify a Custom Society
              </button>
            </Link>
          </div>
        )}

        {/* Hero + Mini Cards Layout */}
        {!loading && heroSociety && (
          <>
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 max-w-7xl mx-auto mb-10">

              {/* HERO CARD (Big, left side) */}
              <Link href={`/tools/verify-society/${heroSociety.slug}`}>
                <div className="group relative bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-[#029bba] shadow-lg hover:shadow-2xl hover:shadow-[#029bba]/20 transition-all duration-300 cursor-pointer h-full flex flex-col">

                  {/* Image */}
                  <div className="relative h-80 lg:h-96 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {heroSociety.featuredImage ? (
                      <Image
                        src={heroSociety.featuredImage}
                        alt={heroSociety.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 1024px) 100vw, 60vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 className="w-24 h-24 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#029bba] to-[#004063] text-white text-xs font-bold shadow-lg">
                        <Star className="w-3.5 h-3.5 fill-white" />
                        Top Rated
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getNocLabel(heroSociety.nocStatus).bg} text-white text-xs font-bold shadow-lg`}>
                        <BadgeCheck className="w-3.5 h-3.5" />
                        {getNocLabel(heroSociety.nocStatus).text}
                      </div>
                    </div>

                    {heroSociety.activeAlertCount > 0 && (
                      <div className="absolute top-4 right-4">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ef4444]/95 text-white text-[10px] font-bold backdrop-blur-sm shadow-lg animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          {heroSociety.activeAlertCount} Active Alert{heroSociety.activeAlertCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    {/* Bottom content overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-2xl md:text-3xl mb-1 leading-tight group-hover:text-[#06b6d4] transition-colors">
                            {heroSociety.name}
                          </h3>
                          <p className="text-white/80 text-sm flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {heroSociety.areaName}, {heroSociety.city} · {heroSociety.approvalAuthority}
                          </p>
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-xl flex-shrink-0">
                          <div className={`text-3xl font-extrabold ${getScoreColor(heroSociety.scores.overall)} leading-none`}>
                            {heroSociety.scores.overall}
                          </div>
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-1">
                            /100 Score
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* Score breakdowns */}
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      {[
                        { label: 'Legal', value: heroSociety.scores.legal, icon: <Shield className="w-3.5 h-3.5" /> },
                        { label: 'Growth', value: heroSociety.scores.growth, icon: <TrendingUp className="w-3.5 h-3.5" /> },
                        { label: 'Overall', value: heroSociety.scores.overall, icon: <Award className="w-3.5 h-3.5" /> },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-3 rounded-xl bg-gradient-to-br from-[#f8fcfd] to-white border border-[#029bba]/10">
                          <div className="flex items-center justify-center gap-1 mb-1.5">
                            <span className={getScoreColor(s.value)}>{s.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</span>
                          </div>
                          <div className={`text-xl font-extrabold ${getScoreColor(s.value)}`}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Trust signals */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      {heroSociety.isVerifiedByHighrise && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-bold">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Highrise Verified
                        </span>
                      )}
                      {heroSociety.developerName && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                          <Building2 className="w-3 h-3" />
                          {heroSociety.developerName}
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <button className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#004063] hover:to-[#029bba] text-white font-bold shadow-lg group-hover:shadow-xl transition-all">
                      View Full Intelligence Report
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </Link>

              {/* 4 MINI CARDS (Right side, 2x2 grid) */}
              <div className="grid grid-cols-2 gap-4">
                {miniSocieties.map((society) => (
                  <Link key={society._id} href={`/tools/verify-society/${society.slug}`}>
                    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-[#029bba] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col">

                      {/* Image */}
                      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        {society.featuredImage ? (
                          <Image
                            src={society.featuredImage}
                            alt={society.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 1024px) 50vw, 20vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                        {/* Score badge */}
                        <div className="absolute top-2 right-2 bg-white rounded-lg px-2 py-1 shadow-md">
                          <div className={`text-sm font-extrabold ${getScoreColor(society.scores.overall)} leading-none`}>
                            {society.scores.overall}
                          </div>
                        </div>

                        {/* NOC dot */}
                        <div className="absolute bottom-2 left-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${getNocLabel(society.nocStatus).bg} shadow ring-2 ring-white`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3 flex-1 flex flex-col">
                        <h4 className="font-bold text-[#001f2b] text-sm leading-tight mb-1 line-clamp-1 group-hover:text-[#029bba] transition-colors">
                          {society.name}
                        </h4>
                        <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{society.city}</span>
                        </p>
                        <div className="mt-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#029bba] group-hover:gap-2 transition-all">
                          View Report
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom CTA Row */}
            <div className="text-center">
              <div className="inline-flex flex-col sm:flex-row items-center gap-3">
                <Link href="/societies">
                  <button className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#06b6d4] hover:from-[#06b6d4] hover:to-[#029bba] text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-[#029bba]/40 transition-all hover:-translate-y-0.5">
                    <Building2 className="w-5 h-5" />
                    Browse All Verified Societies
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/tools/verify-society">
                  <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border-2 border-[#029bba]/30 hover:border-[#029bba] text-[#029bba] font-semibold transition-all">
                    <Shield className="w-5 h-5" />
                    Verify Custom Society
                  </button>
                </Link>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                💡 Every society scored on Legal, Growth, Infrastructure, Possession, Livability + Overall score (0-100)
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Risk Alert Preview ───────────────────────────────────────────────────────

interface RiskAlertPreviewProps {
  alerts: RiskAlertItem[];
  stats: RiskAlertStats | null;
  loading: boolean;
}

function RiskAlertPreview({ alerts, stats, loading }: RiskAlertPreviewProps): React.ReactElement {
  const sampleAlerts: RiskAlertItem[] = [
    {
      _id: 'sample-1',
      severity: 'high',
      society: 'XYZ Housing Scheme',
      city: 'Rawalpindi',
      message: 'Court stay order issued — transactions suspended by RDA.',
      authority: 'RDA',
      date: '2 days ago',
      title: 'Court Stay Order — XYZ Housing Scheme',
      category: 'legal',
      status: 'active',
      sourceType: 'society',
      sourceSlug: '',
      issuedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      _id: 'sample-2',
      severity: 'medium',
      society: 'ABC Gardens',
      city: 'Lahore',
      message: 'NOC under review — no new bookings advised by LDA.',
      authority: 'LDA',
      date: '5 days ago',
      title: 'NOC Under Review — ABC Gardens',
      category: 'noc',
      status: 'active',
      sourceType: 'society',
      sourceSlug: '',
      issuedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    },
    {
      _id: 'sample-3',
      severity: 'high',
      society: 'Dream City',
      city: 'Karachi',
      message: 'Declared illegal by KDA. Avoid all investments immediately.',
      authority: 'KDA',
      date: '1 week ago',
      title: 'Illegal Scheme — Dream City',
      category: 'fraud',
      status: 'active',
      sourceType: 'society',
      sourceSlug: '',
      issuedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  const displayAlerts = alerts.length > 0 ? alerts.slice(0, 3) : sampleAlerts;
  const isUsingRealData = alerts.length > 0;
  const activeCount = stats?.activeCount ?? 12;

  return (
    <section className="relative py-16 md:py-20 bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Red accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ef4444] to-transparent" />

      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 max-w-7xl mx-auto">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/30 backdrop-blur-sm text-[#fca5a5] text-xs font-bold uppercase tracking-wider mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
              </span>
              Live Risk Intelligence
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
              Society & Project <span className="text-[#06b6d4]">Risk Alert Board</span>
            </h2>
            <p className="text-white/70 text-sm md:text-base max-w-2xl">
              Real-time intelligence on illegal, disputed, or risky housing schemes and projects across Pakistan.
              <span className="text-white"> Avoid scams before you invest.</span>
            </p>
          </div>

          <Link href="/risk-alerts" className="flex-shrink-0">
            <button className="group px-5 py-3 rounded-xl bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-[#004063] font-semibold text-sm transition-all duration-200 backdrop-blur-sm flex items-center gap-2 shadow-lg">
              View All Alerts
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Alert cards */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/[0.05] backdrop-blur-md rounded-2xl border border-white/10 p-6 animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-6 w-24 bg-white/10 rounded-full" />
                  <div className="h-4 w-16 bg-white/10 rounded" />
                </div>
                <div className="h-6 w-3/4 bg-white/10 rounded mb-2" />
                <div className="h-4 w-1/2 bg-white/10 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {displayAlerts.map((alert, i) => {
              const isHigh     = alert.severity === 'high' || alert.severity === 'critical';
              const isCritical = alert.severity === 'critical';
              const detailHref = alert.sourceType === 'society' && alert.sourceSlug
                ? `/tools/verify-society/${alert.sourceSlug}`
                : alert.sourceType === 'project' && alert.sourceSlug
                  ? `/projects/${alert.sourceSlug}`
                  : '/risk-alerts';

              return (
                <div
                  key={alert._id || i}
                  className="group relative bg-white/[0.05] backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300 overflow-hidden hover:-translate-y-1"
                >
                  {/* Top severity accent line */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[2px] ${
                      isHigh
                        ? 'bg-gradient-to-r from-transparent via-[#ef4444] to-transparent'
                        : 'bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent'
                    } opacity-60 group-hover:opacity-100 transition-opacity`}
                  />

                  <div className="p-6">
                    {/* Severity badge + source type + date */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                            isCritical
                              ? 'bg-[#ef4444]/20 text-[#fca5a5] border-[#ef4444]/40'
                              : isHigh
                                ? 'bg-[#ef4444]/15 text-[#fca5a5] border-[#ef4444]/30'
                                : 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHigh ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                            } animate-pulse`}
                          />
                          {isCritical ? 'Critical' : isHigh ? 'High Risk' : 'Caution'}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/60 border border-white/15">
                          {alert.sourceType === 'project' ? (
                            <><Building className="w-2.5 h-2.5" /> Project</>
                          ) : (
                            <><MapPin className="w-2.5 h-2.5" /> Society</>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-medium flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {alert.date}
                      </span>
                    </div>

                    {/* Society/Project name */}
                    <h3 className="font-bold text-white text-lg mb-1.5 leading-tight group-hover:text-[#06b6d4] transition-colors">
                      {alert.society}
                    </h3>

                    {/* City + Authority */}
                    <div className="flex items-center gap-3 text-xs text-white/60 mb-4">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {alert.city}
                      </span>
                      <span className="w-px h-3 bg-white/20" />
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Issued by {alert.authority}
                      </span>
                    </div>

                    {/* Alert message */}
                    <div className="relative pl-3 border-l-2 border-white/15">
                      <p className="text-sm text-white/80 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>

                    {/* Hover CTA */}
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                        {isUsingRealData ? 'Verified Source' : 'Sample Alert'}
                      </span>
                      <Link href={detailHref}>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#06b6d4] opacity-0 group-hover:opacity-100 transition-opacity">
                          Read Full Report
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Glow */}
                  <div
                    className={`absolute -right-12 -bottom-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none blur-2xl ${
                      isHigh ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-10 max-w-7xl mx-auto">
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-[#fca5a5]" />
                </div>
                <div>
                  <div className="font-bold text-white">{activeCount}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">Active Alerts</div>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#6ee7b7]" />
                </div>
                <div>
                  <div className="font-bold text-white">500+</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">Verified Societies</div>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10 hidden md:block" />
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#029bba]/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#06b6d4]" />
                </div>
                <div>
                  <div className="font-bold text-white">24/7</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">Real-time Updates</div>
                </div>
              </div>
            </div>

            <Link href="/tools/verify-society">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold text-sm shadow-lg transition-all">
                <ShieldCheck className="w-4 h-4" />
                Verify Your Society Free
              </button>
            </Link>
          </div>
        </div>

        {/* Disclaimer — only show when using sample data */}
        {!isUsingRealData && !loading && (
          <p className="text-center text-xs text-white/40 mt-6 max-w-2xl mx-auto">
            <Info className="w-3 h-3 inline mr-1" />
            Sample alerts shown for demonstration. Real-time data will populate as society database grows.
            All alerts sourced from official authorities (LDA, CDA, RDA, KDA, DHA).
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomePage(): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();

  // Unified Compare Hook
  const {
    isInCompare,
    toggle: toggleCompare,
    actionState: compareState,
    isMaxReached,
  } = useCompare({ defaultEntityType: 'property' });

  // Data states
  const [featuredProperties, setFeaturedProperties] = useState<PropertyItem[]>([]);
  const [installmentProperties, setInstallmentProperties] = useState<PropertyItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [trustedPartners, setTrustedPartners] = useState<PartnerItem[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertItem[]>([]);
  const [riskAlertStats, setRiskAlertStats] = useState<RiskAlertStats | null>(null);
  const [verifiedSocieties, setVerifiedSocieties] = useState<SocietyItem[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(true);

  // Loading states
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingInstallments, setLoadingInstallments] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDevelopers, setLoadingDevelopers] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadingRiskAlerts, setLoadingRiskAlerts] = useState(true);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyCategory, setPropertyCategory] = useState('');
  const [listingType, setListingType] = useState('');

  // Hero banner state
  const [heroImages, setHeroImages] = useState<HeroBannerSlide[]>([]);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Favorites states
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [favoriteLoadingMap, setFavoriteLoadingMap] = useState<Record<string, boolean>>({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'already_subscribed'>('success');
  const [modalMessage, setModalMessage] = useState('');

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  // City dropdown
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getFavoriteKey = (entityType: 'property' | 'project', entityId: string): string =>
    `${entityType}:${entityId}`;

  // ── Effects ────────────────────────────────────────────────────────────────

  // Hero auto-rotate
  useEffect(() => {
    if (!heroImages.length) return;
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroImages]);

  // Close city dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track hero banner impression
  useEffect(() => {
    const currentBanner = heroImages[currentHeroImage];
    if (!currentBanner?.id || typeof currentBanner.id === 'number') return;

    fetch(`/api/hero-banners/${currentBanner.id}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }, [currentHeroImage, heroImages]);

  // Visibility change — refresh favorites
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.user) {
        fetchFavorites();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  // Fetch hero banners
  useEffect(() => {
    const fetchHeroBanners = async () => {
      try {
        const res = await fetch('/api/hero-banners');
        const data = await res.json();

        if (data.success && Array.isArray(data.banners) && data.banners.length > 0) {
          const mapped: HeroBannerSlide[] = data.banners
            .filter((b: { imageUrl?: string }) => b?.imageUrl)
            .map((b: {
              _id: string;
              imageUrl: string;
              title?: string;
              subtitle?: string;
              ctaText?: string;
              ctaLink?: string;
              sponsorName?: string;
              isPaidPromotion?: boolean;
            }) => ({
              id: b._id,
              url: b.imageUrl,
              title: b.title || 'Featured Promotion',
              subtitle: b.subtitle || '',
              ctaText: b.ctaText || '',
              ctaLink: b.ctaLink || '',
              sponsorName: b.sponsorName || '',
              isPaidPromotion: Boolean(b.isPaidPromotion),
            }));
          setHeroImages(mapped.length > 0 ? mapped : fallbackHeroImages);
        } else {
          setHeroImages(fallbackHeroImages);
        }
      } catch {
        setHeroImages(fallbackHeroImages);
      } finally {
        setHeroLoading(false);
      }
    };
    fetchHeroBanners();
  }, []);

  // Fetch featured properties
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/properties?isFeatured=true&limit=6');
        const data = await res.json();
        const list: PropertyItem[] = Array.isArray(data?.properties) ? data.properties : [];
        if (list.length > 0) { setFeaturedProperties(list); return; }

        const fallbackRes = await fetch('/api/properties?limit=6');
        const fallbackData = await fallbackRes.json();
        setFeaturedProperties(Array.isArray(fallbackData?.properties) ? fallbackData.properties : []);
      } catch {
        setFeaturedProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };
    run();
  }, []);

  // Fetch installment properties
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/properties?listingType=installment&limit=6');
        const data = await res.json();
        setInstallmentProperties(data.success ? (data.properties || []) : []);
      } catch {
        setInstallmentProperties([]);
      } finally {
        setLoadingInstallments(false);
      }
    };
    run();
  }, []);

  // Fetch projects — status=verified
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/projects?status=verified&limit=6');
        const data = await res.json();
        setProjects(data.success ? (data.projects || []) : []);
      } catch {
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    run();
  }, []);

  // Fetch developers
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/developers?isVerified=true&limit=6');
        const data = await res.json();
        setDevelopers(data.success ? (data.developers || []) : []);
      } catch {
        setDevelopers([]);
      } finally {
        setLoadingDevelopers(false);
      }
    };
    run();
  }, []);

  // Fetch blogs
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/blogs?status=published&limit=3');
        const data = await res.json();
        setBlogs(data.success ? (data.blogs || []) : []);
      } catch {
        setBlogs([]);
      } finally {
        setLoadingBlogs(false);
      }
    };
    run();
  }, []);

  // Fetch cities
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/cities');
        const data = await res.json();
        setCities(data.success ? (data.cities || []) : []);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };
    run();
  }, []);

  // Fetch trusted partners
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/trusted-partners');
        const data = await res.json();
        setTrustedPartners(data.success ? (data.partners || []) : []);
      } catch {
        setTrustedPartners([]);
      } finally {
        setLoadingPartners(false);
      }
    };
    run();
  }, []);

  // Fetch favorites (only when logged in)
  const fetchFavorites = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/favorites?mode=list&entityType=property&limit=500&_ts=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.favorites)) {
        const nextMap: Record<string, boolean> = {};
        data.data.favorites.forEach((fav: { entityId: string | { _id: string } }) => {
          const entityId = typeof fav?.entityId === 'object' ? fav.entityId._id : fav.entityId;
          if (entityId) nextMap[`property:${String(entityId)}`] = true;
        });
        setFavoriteMap(nextMap);
      }
    } catch {
      // silent
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) fetchFavorites();
  }, [session, fetchFavorites]);

  // Fetch risk alerts
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/risk-alerts?limit=3&status=active');
        const data = await res.json();
        if (data.success && Array.isArray(data.alerts)) {
          setRiskAlerts(data.alerts);
          setRiskAlertStats(data.stats ?? null);
        }
      } catch {
        // silent — component falls back to sample data
      } finally {
        setLoadingRiskAlerts(false);
      }
    };
    run();
  }, []);

  // Fetch verified societies (top 5 by score)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/societies?isVerified=true&sortBy=overallScore&limit=5');
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.societies)) {
          setVerifiedSocieties(data.data.societies);
        }
      } catch {
        setVerifiedSocieties([]);
      } finally {
        setLoadingSocieties(false);
      }
    };
    run();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (propertyType) params.append('propertyType', propertyType);
    if (propertyCategory) params.append('propertyCategory', propertyCategory);
    if (listingType) params.append('listingType', listingType);
    router.push(`/properties?${params.toString()}`);
  };

  const handlePropertyTypeChange = (type: string, category: string) => {
    setPropertyType(type);
    setPropertyCategory(category);
  };

  const handleFavoriteToggle = async (
    entityType: 'property' | 'project',
    entityId: string,
    e?: React.MouseEvent
  ) => {
    e?.preventDefault();
    e?.stopPropagation();

    const favoriteKey = getFavoriteKey(entityType, entityId);
    const previousState = favoriteMap[favoriteKey];

    if (!session?.user) {
      showToast('Please sign in to save properties', 'info');
      return;
    }

    setFavoriteMap((prev) => ({ ...prev, [favoriteKey]: !previousState }));
    setFavoriteLoadingMap((prev) => ({ ...prev, [favoriteKey]: true }));

    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFavoriteMap((prev) => ({ ...prev, [favoriteKey]: previousState }));
        showToast(data?.message || 'Unable to update favorites', 'error');
        return;
      }

      setFavoriteMap((prev) => ({ ...prev, [favoriteKey]: Boolean(data?.data?.isFavorited) }));
      showToast(data?.data?.isFavorited ? 'Saved to your list' : 'Removed from saved', 'success');
    } catch {
      setFavoriteMap((prev) => ({ ...prev, [favoriteKey]: previousState }));
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setFavoriteLoadingMap((prev) => ({ ...prev, [favoriteKey]: false }));
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      setModalType('error'); setModalMessage('Please enter your email address'); setShowModal(true); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setModalType('error'); setModalMessage('Please enter a valid email address'); setShowModal(true); return;
    }
    if (!turnstileToken) {
      setModalType('error'); setModalMessage('Please complete the CAPTCHA verification.'); setShowModal(true); return;
    }
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, source: 'homepage', turnstileToken }),
      });
      const data = await res.json();
      if (data.success) {
        setModalType('success'); setShowModal(true);
        setNewsletterEmail(''); setTurnstileToken(null); setTurnstileKey((k) => k + 1);
      } else {
        setModalType(data.message?.toLowerCase().includes('already') ? 'already_subscribed' : 'error');
        setModalMessage(data.message || 'Failed to subscribe. Please try again.');
        setShowModal(true);
        setTurnstileToken(null); setTurnstileKey((k) => k + 1);
      }
    } catch {
      setModalType('error'); setModalMessage('Network error. Please try again.'); setShowModal(true);
      setTurnstileToken(null); setTurnstileKey((k) => k + 1);
    } finally {
      setIsSubscribing(false);
    }
  };

  const isExternalLink = (url: string): boolean =>
    url.startsWith('http://') || url.startsWith('https://');

  const handleHeroCtaClick = async (banner: HeroBannerSlide) => {
    if (!banner.ctaLink) return;
    fetch(`/api/hero-banners/${banner.id}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
    if (isExternalLink(banner.ctaLink)) {
      window.open(banner.ctaLink, '_blank', 'noopener,noreferrer');
    } else {
      router.push(banner.ctaLink);
    }
  };

  const handleListProperty = () => {
    if (session?.user) {
      router.push('/add-property');
    } else {
      router.push('/login?redirect=/add-property');
    }
  };

  // ── City helpers ───────────────────────────────────────────────────────────

  const DEFAULT_CITY_IMG = 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80';
  const isBadString = (v: unknown): boolean => {
    if (typeof v !== 'string') return true;
    const s = v.trim().toLowerCase();
    return !s || s === 'undefined' || s === 'null' || s === 'n/a';
  };

  const getCityImage = (c: CityItem): string => {
    const raw = c.imageUrl ?? c.image;
    return typeof raw === 'string' && !isBadString(raw) ? raw : DEFAULT_CITY_IMG;
  };

  const getPickedCities = (): CityItem[] => {
    const allActive = cities.filter((c) => c.isActive !== false);
    const featured = allActive
      .filter((c) => c.isFeaturedOnHomepage)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || (b.propertyCount ?? 0) - (a.propertyCount ?? 0));
    const nonFeatured = allActive
      .filter((c) => !c.isFeaturedOnHomepage)
      .sort((a, b) => (b.propertyCount ?? 0) - (a.propertyCount ?? 0));

    const picked: CityItem[] = [];
    const used = new Set<string>();
    for (const c of [...featured, ...nonFeatured]) {
      const k = (c.name || '').trim().toLowerCase();
      if (!k || used.has(k)) continue;
      used.add(k);
      picked.push(c);
      if (picked.length >= 4) break;
    }
    return picked;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Highrise.pk – Buy, Rent & Verify Properties in Pakistan</title>
        <meta
          name="description"
          content="Pakistan's first property intelligence platform. Verify societies, check fair prices, calculate construction costs, and discover verified properties across Pakistan."
        />
        <meta
          name="keywords"
          content="Pakistan real estate, buy property Pakistan, verify society NOC, fair price estimator, construction cost calculator, Highrise.pk"
        />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#029bba" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Highrise.pk" />
        <meta property="og:title" content="Highrise.pk – Pakistan's First Property Intelligence Platform" />
        <meta property="og:description" content="Verify societies, check fair prices, and discover verified properties across Pakistan." />
        <meta property="og:url" content="https://highrise.pk/" />
        <meta property="og:image" content="https://highrise.pk/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Highrise.pk – Pakistan's First Property Intelligence Platform" />
        <meta name="twitter:description" content="Verify, compare, and invest with confidence." />
        <meta name="twitter:image" content="https://highrise.pk/og-image.jpg" />
        <link rel="canonical" href="https://highrise.pk/" />
      </Head>

      <div className="min-h-screen">

        {/* ── Market Pulse Ticker ── */}
        <MarketPulseTicker />

        {/* ── HERO SECTION ── */}
        <section className="relative flex flex-col min-h-[calc(100vh-88px)] z-[40]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00263b] via-[#003553] to-[#001927]" />

          {/* Hero Images */}
          <div className="absolute inset-0">
            {heroLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
              </div>
            ) : (
              heroImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    currentHeroImage === index ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/50 to-black/65" />
                </div>
              ))
            )}
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_42%)] pointer-events-none" />

          <div className="container mx-auto px-4 relative z-[60] flex flex-col flex-grow">
            {/* Main Heading */}
            <div className="flex-grow flex flex-col items-center justify-center text-center pt-10 md:pt-12 pb-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.15] tracking-tight max-w-4xl mx-auto">
                <span className="block">Pakistan&apos;s First</span>
                <span className="block mt-2 text-[#06b6d4]">Property Intelligence Platform</span>
              </h1>
              <p className="text-base md:text-lg text-white/85 max-w-2xl mx-auto">
  Verify societies, explore Highrise projects, calculate construction costs, and discover verified properties — all in one place.
</p>

              {/* Intent CTA Buttons */}
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                {[
                  { label: '🔍 Verify Society', href: '/tools/verify-society', primary: true },
                  { label: '💰 Check Price', href: '/tools/price-estimator', primary: false },
                  { label: '🧱 Build Cost', href: '/tools/construction-calculator', primary: false },
                  { label: '🏠 Browse Properties', href: '/properties', primary: false },
                ].map((btn) => (
                  <Link key={btn.label} href={btn.href}>
                    <button
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        btn.primary
                          ? 'bg-[#029bba] text-white hover:bg-[#027a94] shadow-lg'
                          : 'bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm'
                      }`}
                    >
                      {btn.label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Navigation Dots — only show if multiple admin banners exist */}
            {heroImages.length > 1 && (
              <div className="flex justify-center gap-2 pb-4">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentHeroImage(index)}
                    aria-label={`Show hero slide ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentHeroImage === index ? 'bg-white w-8' : 'bg-white/40 w-2'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Dynamic Banner Content — only show when admin uploads paid promotion with content */}
            {heroImages[currentHeroImage] &&
              (heroImages[currentHeroImage].title ||
                heroImages[currentHeroImage].subtitle ||
                heroImages[currentHeroImage].ctaText) && (
                <div className="mb-3 text-center max-w-3xl mx-auto transition-all duration-500">
                  <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                    {heroImages[currentHeroImage].title && (
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">
                        {heroImages[currentHeroImage].title}
                      </h3>
                    )}
                    {heroImages[currentHeroImage].subtitle && (
                      <p className="text-xs md:text-sm text-white/90 max-w-2xl mx-auto">
                        {heroImages[currentHeroImage].subtitle}
                      </p>
                    )}
                    {heroImages[currentHeroImage].isPaidPromotion &&
                      heroImages[currentHeroImage].sponsorName && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#029bba]/20 border border-[#029bba]/30 text-xs font-semibold text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] mr-2" />
                            Sponsored by {heroImages[currentHeroImage].sponsorName}
                          </span>
                        </div>
                      )}
                    {heroImages[currentHeroImage].ctaText &&
                      heroImages[currentHeroImage].ctaLink && (
                        <button
                          onClick={() => handleHeroCtaClick(heroImages[currentHeroImage])}
                          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-all shadow-lg active:scale-[0.98]"
                        >
                          {heroImages[currentHeroImage].ctaText}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                </div>
              )}

            {/* Search Bar */}
            <div className="w-full max-w-5xl mx-auto mt-4 md:mt-6 pb-12 md:pb-14">
              <form
                onSubmit={handleSearch}
                className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl p-4 md:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Quick Filter Tags */}
                  <div className="md:col-span-12">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'full_payment', label: 'Buy', icon: <BadgeDollarSign className="w-3.5 h-3.5" /> },
                        { id: 'rent', label: 'Rent', icon: <KeyRound className="w-3.5 h-3.5" /> },
                        { id: 'installment', label: 'Installments', icon: <Banknote className="w-3.5 h-3.5" /> },
                        { id: '', label: 'All', icon: <Building2 className="w-3.5 h-3.5" /> },
                      ].map((item) => (
                        <button
                          key={item.id || 'all'}
                          type="button"
                          onClick={() => setListingType(item.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                            listingType === item.id
                              ? 'bg-[#029bba] text-white shadow-md'
                              : 'bg-white/70 text-slate-700 hover:bg-white hover:text-[#029bba]'
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="md:col-span-7" ref={searchContainerRef}>
                    <div className="relative w-full">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); if (!isCityDropdownOpen) setIsCityDropdownOpen(true); }}
                        onFocus={() => setIsCityDropdownOpen(true)}
                        placeholder="Enter city, location or project name..."
                        className="w-full h-14 pl-12 pr-4 rounded-xl border border-transparent bg-white/90 text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:border-[#029bba] focus:ring-4 focus:ring-[#029bba]/10 outline-none transition-all"
                        autoComplete="off"
                      />
                      {isCityDropdownOpen && searchQuery.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 z-[170] overflow-hidden">
                          <div className="max-h-60 overflow-y-auto p-2">
                            {cities
                              .filter((city) => city.name.toLowerCase().includes(searchQuery.toLowerCase()))
                              .slice(0, 10)
                              .map((city) => (
                                <button
                                  key={city.name}
                                  type="button"
                                  onClick={() => { setSearchQuery(city.name); setIsCityDropdownOpen(false); }}
                                  className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-800">{city.name}</span>
                                </button>
                              ))}
                            {cities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                              <p className="text-center text-sm text-slate-500 px-3 py-4">
                                No locations found for &quot;{searchQuery}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Type */}
                  <div className="md:col-span-3">
                    <PropertyTypeDropdown value={propertyType} onChange={handlePropertyTypeChange} buttonHeight="h-14" />
                  </div>

                  {/* Search Button */}
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#028eaa] hover:to-[#026f86] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                      <Search className="w-4 h-4" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US ── */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium mb-4">
                Why Highrise.pk
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                <span className="text-[#029bba]">The Smart</span> Way to Find{' '}
                <span className="text-[#029bba]">Properties</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We combine technology with local expertise to make your property journey seamless
              </p>
            </div>

            {/* MATCHING max-w-6xl mx-auto with Smart Tools section */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
              {[
                {
                  icon: <Shield className="w-6 h-6" />,
                  title: 'Verified Listings',
                  description: 'All properties are verified by our team for authenticity',
                  accentColor: '#029bba',
                  bgGradient: 'from-[#029bba] to-[#004063]',
                },
                {
                  icon: <TrendingUp className="w-6 h-6" />,
                  title: 'Price Intelligence',
                  description: 'Data-driven fair price estimates so you never overpay',
                  accentColor: '#027a94',
                  bgGradient: 'from-[#027a94] to-[#003553]',
                },
                {
                  icon: <ShieldCheck className="w-6 h-6" />,
                  title: 'NOC Verification',
                  description: "Check any society's legal status before you invest",
                  accentColor: '#004063',
                  bgGradient: 'from-[#004063] to-[#001f2b]',
                },
                {
                  icon: <Award className="w-6 h-6" />,
                  title: 'Trusted Developers',
                  description: 'Connect with verified and reputable developers across Pakistan',
                  accentColor: '#06b6d4',
                  bgGradient: 'from-[#06b6d4] to-[#029bba]',
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#029bba] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  {/* Subtle teal accent line on top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${feature.accentColor}, transparent)`,
                    }}
                  />

                  {/* Icon container with brand gradient */}
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.bgGradient} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>

                  {/* Title in dark navy */}
                  <h3 className="text-lg font-bold text-[#004063] mb-2 group-hover:text-[#029bba] transition-colors">
                    {feature.title}
                  </h3>

                  {/* Gray description */}
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Subtle background pattern (only visible on hover) */}
                  <div
                    className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"
                    style={{ backgroundColor: feature.accentColor }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTELLIGENCE TOOL CARDS ── */}
        <IntelligenceToolCards />

        {/* ── DISCOVER PROPERTIES ── */}
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#029bba]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#004063]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="container mx-auto px-4 relative z-[60]">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <Sparkles className="w-4 h-4" />
                Explore Categories
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                <span className="text-[#029bba]">Discover</span> Your{' '}
                <span className="text-[#029bba]">Perfect Property</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Browse homes, plots & commercial spaces across Pakistan with verified listings
              </p>
            </div>

            <div className="flex justify-center mb-12">
              <div className="inline-flex items-center gap-4">
                {[
                  { id: 'buy', label: 'Buy', icon: <Home className="w-4 h-4" /> },
                  { id: 'rent', label: 'Rent', icon: <Building2 className="w-4 h-4" /> },
                  { id: 'projects', label: 'New Projects', icon: <Zap className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'projects') router.push('/projects');
                      else router.push(`/properties?listingType=${tab.id === 'buy' ? 'full_payment' : 'rent'}`);
                    }}
                    className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 bg-[#029bba] text-white shadow-lg hover:shadow-xl hover:bg-[#027a94] hover:-translate-y-0.5"
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {propertyCategories.map((category) => (
                <div key={category.id} className="group">
                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-2xl hover:border-[#029bba]/30 transition-all duration-500 overflow-hidden h-full">
                    <div className="p-6 bg-gradient-to-br from-[#029bba]/10 to-cyan-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#029bba] text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {category.id === 'residential' && <Home className="w-7 h-7" />}
                          {category.id === 'plots' && <Maximize className="w-7 h-7" />}
                          {category.id === 'commercial' && <Building2 className="w-7 h-7" />}
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#029bba]/20 text-[#029bba]">
                          <TrendingUp className="w-3 h-3" /> Popular
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{category.name}</h3>
                      <p className="text-gray-500 text-sm">
                        {category.id === 'residential' && 'Houses, Apartments, Villas & more'}
                        {category.id === 'plots' && 'Residential & Commercial plots'}
                        {category.id === 'commercial' && 'Offices, Shops, Warehouses & more'}
                      </p>
                    </div>
                    <div className="p-6 pt-4">
                      <div className="grid grid-cols-2 gap-2">
                        {category.subtypes.slice(0, 6).map((subtype) => (
                          <Link key={subtype.id} href={`/properties?propertyType=${encodeURIComponent(subtype.id)}`}>
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group/item transition-colors">
                              <span className="text-gray-400 group-hover/item:text-[#029bba] transition-colors">{subtype.icon}</span>
                              <span className="text-sm text-gray-700 group-hover/item:text-gray-900 font-medium truncate">{subtype.name}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <Link href={`/properties?propertyCategory=${category.id}`}>
                        <button className="w-full mt-4 px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-[#029bba]/10 text-[#029bba] hover:bg-[#029bba] hover:text-white">
                          View All {category.name}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED PROPERTIES ── */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium mb-4">
                <Star className="w-4 h-4 inline mr-1" />
                Featured Listings
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                <span className="text-[#029bba]">Handpicked</span> Premium{' '}
                <span className="text-[#029bba]">Properties</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Explore our carefully selected properties offering the best value
              </p>
            </div>

            {loadingProperties ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                <span className="ml-2 text-gray-600">Loading properties...</span>
              </div>
            ) : featuredProperties.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  {featuredProperties.slice(0, 6).map((property) => {
                    const propId = toIdString(property._id) || toIdString(property.id);
                    const fKey = getFavoriteKey('property', propId);
                    const cardHref = `/property/${property.slug || propId}`;

                    return (
                      <div key={propId} className="overflow-hidden bg-white border border-gray-100 hover:border-[#029bba]/30 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(2,155,186,0.15)] flex flex-col justify-between">
                        <div>
                          {/* Image Section wrapped in Link */}
                          <Link href={cardHref} className="block aspect-[16/10] overflow-hidden relative">
                            <Image
                              src={getPrimaryImageUrl(property)}
                              alt={property.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                            {/* Trust Score Badge */}
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm ${
                                property.listingType === 'rent' ? 'bg-orange-500/90 text-white'
                                : property.listingType === 'installment' ? 'bg-purple-500/90 text-white'
                                : 'bg-[#029bba]/90 text-white'
                              }`}>
                                {listingTypeLabel(property.listingType)}
                              </span>
                              {property.isFeatured && (
                                <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-lg">
                                  <Star className="w-3 h-3 fill-white" /> Featured
                                </span>
                              )}
                            </div>

                            {/* Photo count + Favorite */}
                            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                              {(property.images?.length ?? 0) > 1 && (
                                <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {property.images!.length}
                                </span>
                              )}
                              <button
                                type="button"
                                aria-label={favoriteMap[fKey] ? 'Remove from favorites' : 'Add to favorites'}
                                aria-pressed={Boolean(favoriteMap[fKey])}
                                disabled={Boolean(favoriteLoadingMap[fKey])}
                                onClick={(e) => handleFavoriteToggle('property', propId, e)}
                                className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-lg ${
                                  favoriteMap[fKey] ? 'bg-red-50 hover:bg-red-100' : 'bg-white/90 hover:bg-white'
                                } ${favoriteLoadingMap[fKey] ? 'opacity-70 cursor-wait' : 'hover:scale-110'}`}
                              >
                                <Heart
                                  className={`w-4 h-4 transition-colors ${favoriteMap[fKey] ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
                                  fill={favoriteMap[fKey] ? 'currentColor' : 'none'}
                                />
                              </button>
                            </div>

                            {/* Property type + Verified */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-semibold rounded-lg shadow-sm">
                                {property.propertyType}
                              </span>
                              {property.isVerified && (
                                <span className="px-2 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                                  <BadgeCheck className="w-3 h-3" /> Verified
                                </span>
                              )}
                            </div>

                            <div className="absolute bottom-3 right-3">
                              <div className="px-3 py-1.5 bg-white rounded-lg shadow-lg">
                                <p className="text-[#029bba] font-bold text-sm">{formatPKR(property.price, property.listingType)}</p>
                              </div>
                            </div>
                          </Link>

                          {/* Content Section */}
                          <div className="p-4">
                            <Link href={cardHref}>
                              <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-1 group-hover:text-[#029bba] transition-colors text-base">
                                {property.title}
                              </h3>
                            </Link>

                            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                              <span className="line-clamp-1">{getLocationLabel(property)}</span>
                            </p>

                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {(property.bedrooms ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
                                  <BedDouble className="w-3.5 h-3.5 text-gray-500" /> {property.bedrooms} Beds
                                </span>
                              )}
                              {(property.bathrooms ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
                                  <Bath className="w-3.5 h-3.5 text-gray-500" /> {property.bathrooms} Baths
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
                                <Maximize className="w-3.5 h-3.5 text-gray-500" /> {getAreaLabel(property)}
                              </span>
                            </div>

                            {/* Compare Button (Outside Link, completely interactive) */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('COMPARE CLICKED FOR ID:', propId);
                                if (propId) {
                                  await toggleCompare(propId, 'property');
                                }
                              }}
                              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer relative z-20 ${
                                isInCompare(propId, 'property')
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-gray-200 text-gray-600 hover:border-[#029bba]/40 hover:text-[#029bba] hover:bg-[#029bba]/5'
                              }`}
                            >
                              {isInCompare(propId, 'property') ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Added to Compare</span>
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="w-3.5 h-3.5 text-[#029bba]" />
                                  <span>Add to Compare</span>
                                </>
                              )}
                            </button>

                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                                  <Home className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-xs text-gray-500">Highrise Listing</span>
                              </div>
                              <Link href={cardHref} className="text-[#029bba] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                View Details <ArrowRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center mt-12">
                  <Link href="/properties?isFeatured=true">
                    <button className="px-8 py-4 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold transition-colors inline-flex items-center gap-2 shadow-lg hover:shadow-xl">
                      Explore All Featured Properties <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Featured Properties Yet</h3>
                <p className="text-gray-600 mb-6">Check back soon for featured listings</p>
                <Link href="/properties">
                  <button className="px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold transition-colors">
                    Browse All Properties
                  </button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── VERIFIED SOCIETIES — Hero + 4 Mini Cards ── */}
        <VerifiedSocietiesSection
          societies={verifiedSocieties}
          loading={loadingSocieties}
        />

        {/* ── RISK ALERT PREVIEW ── */}
        <RiskAlertPreview
          alerts={riskAlerts}
          stats={riskAlertStats}
          loading={loadingRiskAlerts}
        />

                {/* ── INSTALLMENT PROPERTIES — Premium Light Finance Theme ── */}
        <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#f8fcfd] via-[#eef7fa] to-[#e6f4f8]">

          {/* Decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Top-right teal blob */}
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#029bba]/10 to-transparent blur-3xl" />
            {/* Bottom-left navy blob */}
            <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#004063]/8 to-transparent blur-3xl" />
            {/* Subtle dot pattern */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle, #029bba 1.5px, transparent 1.5px)',
                backgroundSize: '32px 32px',
              }}
            />
            {/* Decorative geometric shapes */}
            <div className="absolute top-20 left-[10%] w-24 h-24 rounded-2xl border-2 border-[#029bba]/15 rotate-12" />
            <div className="absolute bottom-32 right-[8%] w-16 h-16 rounded-full border-2 border-[#004063]/15" />
            <div className="absolute top-1/2 right-[15%] w-20 h-20 rounded-2xl border border-[#06b6d4]/20 -rotate-12" />
          </div>

          <div className="container mx-auto px-4 relative z-10">

            {/* ─── Section Header ─── */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              {/* Premium badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#029bba]/20 shadow-sm mb-5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                  <Banknote className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#004063]">
                  Smart Financing
                </span>
                <span className="text-[10px] font-semibold text-[#029bba] bg-[#029bba]/10 px-2 py-0.5 rounded-full">
                  Easy EMI Plans
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-[#001f2b] mb-4 leading-tight tracking-tight">
                Own Your{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#029bba]">Dream Property</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#06b6d4]/20 -z-0" />
                </span>
                <br />
                With Flexible{' '}
                <span className="text-[#029bba]">Installments</span>
              </h2>

              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                No need to pay 100% upfront. Choose properties with{' '}
                <strong className="text-[#004063]">3-20 year payment plans</strong>{' '}
                from trusted Pakistani developers.
              </p>

              {/* Trust strip — moved inline */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
                {[
                  { icon: <ShieldCheck className="w-4 h-4" />, label: 'Verified Plans' },
                  { icon: <Award className="w-4 h-4" />, label: 'Trusted Developers' },
                  { icon: <BadgeCheck className="w-4 h-4" />, label: 'No Hidden Fees' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                    <span className="text-[#029bba]">{item.icon}</span>
                    <span className="font-semibold text-gray-700 text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── EMI Calculator Cross-Promotion Banner ─── */}
            <div className="max-w-5xl mx-auto mb-12">
              <Link href="/tools/home-loan-calculator">
                <div className="group relative bg-white rounded-2xl border-2 border-[#029bba]/20 hover:border-[#029bba] shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer">
                  {/* Gradient accent on left */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#029bba] to-[#004063]" />

                  <div className="flex flex-col md:flex-row items-center gap-4 p-5 md:p-6">
                    {/* Icon + Label */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shadow-lg flex-shrink-0">
                        <Calculator className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#029bba] bg-[#029bba]/10 px-2 py-0.5 rounded-full">
                            New Tool
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Industry-First
                          </span>
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-[#001f2b] mb-0.5">
                          Calculate Your EMI Before You Buy
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600">
                          Compare home loan rates from <strong className="text-[#004063]">10 Pakistani banks</strong> — Islamic + Conventional financing.
                        </p>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold text-sm shadow-md group-hover:shadow-lg transition-all whitespace-nowrap">
                      Open Calculator
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </Link>
            </div>

            {/* ─── Content ─── */}
            {loadingInstallments ? (
              <div className="flex items-center justify-center py-20 bg-white/50 rounded-3xl border border-gray-100 max-w-md mx-auto">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                <span className="ml-3 text-gray-600 font-medium">Loading installment properties...</span>
              </div>
            ) : installmentProperties.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  {installmentProperties.slice(0, 6).map((property, idx) => {
                    const fKey = getFavoriteKey('property', String(property._id));
                    const isFeatured = idx === 0; // First card gets "Best Deal" badge
                    return (
                      <Link key={property._id} href={`/property/${property.slug || property._id}`}>
                        <div className="group relative bg-white border-2 border-gray-100 hover:border-[#029bba]/40 rounded-3xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(2,155,186,0.18)] cursor-pointer">

                          {/* Best Deal Pulse Badge (first card only) */}
                          {isFeatured && (
                            <div className="absolute top-3 left-3 z-20">
                              <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#029bba] to-[#004063] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                </span>
                                Best Deal
                              </span>
                            </div>
                          )}

                          {/* Image */}
                          <div className="aspect-[16/10] overflow-hidden relative">
                            <Image
                              src={getPrimaryImageUrl(property)}
                              alt={property.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                            {/* Easy Installments badge (top right, smaller) */}
                            {!isFeatured && (
                              <div className="absolute top-3 left-3">
                                <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-[#029bba] text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm">
                                  <Banknote className="w-3 h-3" /> Installments
                                </span>
                              </div>
                            )}

                            {/* Favorite */}
                            <div className="absolute top-3 right-3">
                              <button
                                type="button"
                                aria-label={favoriteMap[fKey] ? 'Remove from favorites' : 'Add to favorites'}
                                aria-pressed={Boolean(favoriteMap[fKey])}
                                disabled={Boolean(favoriteLoadingMap[fKey])}
                                onClick={(e) => handleFavoriteToggle('property', toIdString(property._id) || toIdString(property.id), e)}
                                className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-md ${
                                  favoriteMap[fKey]
                                    ? 'bg-red-500/95 text-white'
                                    : 'bg-white/95 text-gray-600 hover:bg-white hover:text-red-500'
                                } ${favoriteLoadingMap[fKey] ? 'opacity-70 cursor-wait' : 'hover:scale-110'}`}
                              >
                                <Heart className="w-4 h-4" fill={favoriteMap[fKey] ? 'currentColor' : 'none'} />
                              </button>
                            </div>

                            {/* Property type */}
                            <div className="absolute bottom-3 left-3">
                              <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-semibold rounded-lg shadow-sm">
                                {property.propertyType}
                              </span>
                            </div>

                            {/* Total price (small chip) */}
                            <div className="absolute bottom-3 right-3">
                              <div className="px-3 py-1.5 bg-white rounded-lg shadow-md">
                                <p className="text-[#004063] font-bold text-sm">{formatPKR(property.price, 'full_payment')}</p>
                              </div>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-5 flex-grow flex flex-col">
                            {/* Title */}
                            <h3 className="font-bold text-[#001f2b] mb-1.5 line-clamp-1 group-hover:text-[#029bba] transition-colors text-base">
                              {property.title}
                            </h3>

                            {/* Location */}
                            <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                              <span className="line-clamp-1">{property.society || getLocationLabel(property)}, {property.city}</span>
                            </p>

                            {/* Plan visual — Progress bar style */}
                            <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-[#f8fcfd] to-[#eef7fa] border border-[#029bba]/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                  Payment Plan
                                </span>
                                <span className="text-[10px] font-bold text-[#029bba]">
                                  {property.installmentYears || '3'} Years
                                </span>
                              </div>
                              {/* Visual progress bar */}
                              <div className="h-1.5 bg-white rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full bg-gradient-to-r from-[#029bba] to-[#06b6d4] rounded-full"
                                  style={{ width: `${property.downPaymentPercentage || 20}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  <strong className="text-[#004063]">{property.downPaymentPercentage || '20'}%</strong> Down
                                </span>
                                <span className="text-gray-600">
                                  <strong className="text-[#004063]">{100 - Number(property.downPaymentPercentage || 20)}%</strong> EMI
                                </span>
                              </div>
                            </div>

                            {/* Footer — Monthly + CTA */}
                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monthly</p>
                                <p className="text-[#029bba] font-extrabold text-lg leading-none mt-0.5">
                                  {formatPKR(property.monthlyInstallment || 0, 'rent')}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[#004063] font-bold text-sm group-hover:gap-2 group-hover:text-[#029bba] transition-all">
                                View Plan
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* CTA */}
                <div className="text-center mt-12">
                  <Link href="/properties?listingType=installment">
                    <button className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#004063] hover:to-[#029bba] text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-[#029bba]/30 transition-all duration-300 hover:-translate-y-0.5">
                      <Banknote className="w-5 h-5" />
                      Explore All Installment Properties
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 New to installments?{' '}
                    <Link href="/tools/home-loan-calculator" className="text-[#029bba] font-semibold hover:underline">
                      Try our EMI Calculator
                    </Link>{' '}
                    first to plan your budget.
                  </p>
                </div>
              </>
            ) : (
              // Empty State — Premium light version
              <div className="max-w-2xl mx-auto">
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
                  {/* Icon with gradient ring */}
                  <div className="relative inline-flex items-center justify-center mb-5">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#029bba]/20 to-[#004063]/20 blur-xl" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shadow-lg">
                      <Banknote className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#001f2b] mb-2">
                    Installment Properties Coming Soon
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                    We&apos;re onboarding trusted developers with flexible payment plans.
                    Meanwhile, explore our other property listings.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link href="/properties">
                      <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold text-sm shadow-md transition-all">
                        <Home className="w-4 h-4" />
                        Browse All Properties
                      </button>
                    </Link>
                    <Link href="/tools/home-loan-calculator">
                      <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-[#029bba] text-[#029bba] hover:bg-[#029bba] hover:text-white font-semibold text-sm transition-all">
                        <Calculator className="w-4 h-4" />
                        Try EMI Calculator
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Quick Stats Strip (bottom) ─── */}
            <div className="mt-14 max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Calculator className="w-5 h-5" />, value: '10', label: 'Bank Options' },
                  { icon: <Clock className="w-5 h-5" />, value: '3-20', label: 'Years Tenure' },
                  { icon: <BadgeDollarSign className="w-5 h-5" />, value: '10-25%', label: 'Down Payment' },
                  { icon: <ShieldCheck className="w-5 h-5" />, value: '100%', label: 'Verified Plans' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all"
                  >
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba]/10 to-[#004063]/10 text-[#029bba] mb-2">
                      {stat.icon}
                    </div>
                    <div className="font-extrabold text-[#001f2b] text-xl">{stat.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PROJECTS ── */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium mb-4">
                <Building2 className="w-4 h-4 inline mr-1" />
                Developer Projects
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                <span className="text-[#029bba]">Explore</span> New{' '}
                <span className="text-[#029bba]">Projects</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Latest residential and commercial projects from verified developers
              </p>
            </div>

            {loadingProjects ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                <span className="ml-2 text-gray-600">Loading projects...</span>
              </div>
            ) : projects.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  {projects.slice(0, 6).map((project) => (
                    <Link key={project._id} href={`/projects/${project.slug || project._id}`}>
                      <div className="overflow-hidden bg-white border border-gray-100 hover:border-[#029bba]/30 rounded-2xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(2,155,186,0.15)] flex flex-col h-full">
                        <div className="h-52 overflow-hidden relative">
                          <Image
                            src={project.images?.[0]?.url || project.coverImage?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'}
                            alt={project.projectName}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-white font-bold text-xl mb-1 line-clamp-1 group-hover:text-[#06b6d4] transition-colors">
                              {project.projectName}
                            </h3>
                            <p className="text-white/80 text-sm flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {project.areaName}, {project.city}
                            </p>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg shadow-lg ${
                              project.projectStatus === 'Completed' ? 'bg-green-500 text-white'
                              : 'bg-gradient-to-r from-[#029bba] to-[#027a94] text-white'
                            }`}>
                              {project.projectStatus || 'New Launch'}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 flex-grow flex flex-col">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-medium rounded-full">
                              {project.projectCategory === 'highrise' ? 'High-rise' : 'Housing Society'}
                            </span>
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                              {project.projectNature || 'Mixed'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-gray-500 text-xs">Starts From</p>
                              <p className="font-bold text-gray-800 text-sm">
                                {project.startingPrice ? formatPKR(project.startingPrice) : 'Contact'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Possession</p>
                              <p className="font-bold text-gray-800 text-sm">{project.possessionDate || 'TBA'}</p>
                            </div>
                          </div>
                          <div className="mt-auto">
                            <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#028eaa] hover:to-[#026f86] text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                              Explore Project <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <Link href="/projects">
                    <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                      View All Projects <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Listed Yet</h3>
                <p className="text-gray-600 mb-6">New developer projects are coming soon!</p>
                <Link href="/projects">
                  <button className="px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold transition-colors">
                    View All Projects
                  </button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── DEVELOPERS & PARTNERS — Unified Premium Section ── */}
        <section className="relative py-20 bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] overflow-hidden">

          {/* Decorative background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#029bba]/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#06b6d4]/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {/* Subtle teal accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#06b6d4]/40 to-transparent" />
          </div>

          <div className="container mx-auto px-4 relative z-10">

            {/* ═══════════════════════════════════════════
                UNIFIED SECTION HEADER
            ═══════════════════════════════════════════ */}
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#029bba] to-[#06b6d4] flex items-center justify-center">
                  <Award className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Verified Partners
                </span>
                <span className="text-[10px] font-semibold text-[#06b6d4] bg-[#06b6d4]/15 px-2 py-0.5 rounded-full">
                  Trusted Network
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
                Pakistan&apos;s Most{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#06b6d4]">Trusted</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#06b6d4]/20 -z-0" />
                </span>{' '}
                Developers
              </h2>

              <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
                Top-rated and verified developers delivering quality housing societies, gated communities,
                and highrise projects across Pakistan.
                <span className="text-white"> Browse portfolios + see our trusted network.</span>
              </p>
            </div>

            {/* ═══════════════════════════════════════════
                PART 1: FEATURED DEVELOPER CARDS
            ═══════════════════════════════════════════ */}
            {loadingDevelopers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <span className="ml-3 text-white/70 font-medium">Loading developers...</span>
              </div>
            ) : developers.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-14">
                  {developers.slice(0, 6).map((developer) => (
                    <Link key={developer._id} href={`/developers/${developer.slug || developer._id}`}>
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer group h-full flex flex-col hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-[#029bba]/20">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg relative">
                            {developer.logo?.url ? (
                              <Image src={developer.logo.url} alt={developer.companyName} fill className="object-contain" sizes="64px" />
                            ) : (
                              <Building2 className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-lg truncate">{developer.companyName}</h3>
                              {developer.isVerified && <BadgeCheck className="w-5 h-5 text-[#06b6d4] flex-shrink-0" />}
                            </div>
                            <p className="text-white/60 text-sm capitalize">{developer.developerType}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < (developer.rating || 4) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                              ))}
                              <span className="text-white/60 text-xs ml-1">({developer.reviewsCount || 0})</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {[
                            { value: developer.completedProjectsCount || 0, label: 'Completed' },
                            { value: developer.activeProjectsCount || 0, label: 'Active' },
                            { value: developer.establishedYear || 'N/A', label: 'Since' },
                          ].map((stat) => (
                            <div key={stat.label} className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-2xl font-bold text-white">{stat.value}</p>
                              <p className="text-xs text-white/60">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-white/60 text-sm flex items-center gap-2 mb-5">
                          <MapPin className="w-4 h-4 text-white/50" />
                          {developer.city || 'Pakistan'}
                        </p>
                        <div className="mt-auto">
                          <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#028eaa] hover:to-[#026f86] text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                            View Profile & Projects <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="max-w-2xl mx-auto mb-14">
                <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#029bba]/20 to-[#06b6d4]/20 mb-4">
                    <Award className="w-8 h-8 text-[#06b6d4]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Developer Profiles Coming Soon</h3>
                  <p className="text-white/60 text-sm mb-5 max-w-md mx-auto">
                    We&apos;re onboarding verified developers across Pakistan.
                  </p>
                  <Link href="/onboarding/business?role=developer">
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold text-sm shadow-lg transition-all">
                      <Building2 className="w-4 h-4" />
                      Become a Partner
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════
                ELEGANT DIVIDER
            ═══════════════════════════════════════════ */}
            <div className="flex items-center gap-4 max-w-3xl mx-auto mb-10">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/15" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-[#06b6d4]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  Our Partner Network
                </span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/15" />
            </div>

            {/* ═══════════════════════════════════════════
                PART 2: PARTNER LOGOS MARQUEE
            ═══════════════════════════════════════════ */}
            <div className="mb-10">
              <p className="text-center text-sm text-white/60 mb-6 max-w-xl mx-auto">
                Working with Pakistan&apos;s most reputable real estate brands, builders, and industry leaders
              </p>

              <div className="relative w-full overflow-hidden">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#001927] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#001927] to-transparent z-10 pointer-events-none" />

                <div className="flex animate-partner-marquee">
                  {[...Array(2)].map((_, dupIdx) => (
                    <div key={dupIdx} className="flex items-center gap-6 md:gap-8 px-4">
                      {(loadingPartners ? Array(8).fill(null) : trustedPartners.slice(0, 8)).map((partner, index) => (
                        <div
                          key={`partner-${dupIdx}-${index}`}
                          className="flex-shrink-0 w-40 h-20 bg-white/95 backdrop-blur-sm rounded-2xl border border-white/15 flex items-center justify-center p-4 hover:bg-white hover:shadow-2xl hover:shadow-[#029bba]/30 hover:border-[#06b6d4]/40 transition-all duration-300 hover:-translate-y-0.5"
                        >
                          {loadingPartners ? (
                            <Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
                          ) : partner?.logo?.url ? (
                            <Image src={partner.logo.url} alt={partner.companyName || 'Partner'} width={120} height={60} className="object-contain max-h-12" />
                          ) : (
                            <span className="text-gray-500 text-xs font-semibold text-center px-2 leading-tight">{partner?.companyName || `Partner ${index + 1}`}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════
                UNIFIED CTA SECTION
            ═══════════════════════════════════════════ */}
            <div className="text-center">
              <div className="inline-flex flex-col sm:flex-row items-center gap-3">
                {/* Primary CTA — Browse Developers */}
                <Link href="/developers">
                  <button className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#06b6d4] hover:from-[#06b6d4] hover:to-[#029bba] text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-[#029bba]/40 transition-all duration-300 hover:-translate-y-0.5">
                    <Users className="w-5 h-5" />
                    Browse All Developers
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>

                {/* Secondary CTA — Become Partner */}
                <Link href="/onboarding/business?role=developer">
                  <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold transition-all">
                    <Building2 className="w-5 h-5" />
                    Become a Partner
                  </button>
                </Link>
              </div>

              {/* Trust footer */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-white/50">
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#06b6d4]" />
                  <span>SECP Registered</span>
                </div>
                <span className="text-white/20">·</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#06b6d4]" />
                  <span>NOC Verified</span>
                </div>
                <span className="text-white/20">·</span>
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#06b6d4]" />
                  <span>Quality Assured</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CITIES ── */}
        <section className="py-20 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[620px] h-[620px] bg-[#029bba]/6 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-[#004063]/5 rounded-full blur-3xl translate-y-1/2" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-4">
                <MapPin className="w-4 h-4" />
                Popular Locations
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-[#029bba]">Explore</span> Properties{' '}
                <span className="text-[#029bba]">by City</span>
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                Discover your perfect property in Pakistan&apos;s most sought-after locations
              </p>
            </div>

            {loadingCities ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                <span className="ml-2 text-slate-600">Loading cities...</span>
              </div>
            ) : (() => {
              const picked = getPickedCities();
              if (!picked.length) {
                return (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">No cities configured</h3>
                    <p className="text-sm text-slate-600 mt-1">Add cities in the admin panel.</p>
                  </div>
                );
              }
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                    {picked.map((city, index) => (
                      <Link key={city.name || index} href={`/properties?city=${encodeURIComponent(city.name || '')}`}>
                        <div className="group relative aspect-[9/16] rounded-3xl overflow-hidden cursor-pointer ring-1 ring-black/5 bg-slate-200 shadow-sm hover:shadow-xl hover:ring-[#029bba]/25 transition-all duration-300 hover:-translate-y-1">
                          <Image
                            src={getCityImage(city)}
                            alt={city.name || 'City'}
                            fill
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10 transition-all duration-500 group-hover:from-black/95" />
                          <div className="absolute top-4 left-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/25">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              {city.isFeaturedOnHomepage ? 'Featured' : 'Popular'}
                            </span>
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/25">
                              <Building2 className="w-3 h-3" />
                              {(city.propertyCount || 0).toLocaleString()}+
                            </span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <div className="flex items-end justify-between gap-4">
                              <div className="min-w-0">
                                <h3 className="text-2xl font-bold text-white mb-1 truncate group-hover:text-[#06b6d4] transition-colors">
                                  {city.name}
                                </h3>
                                <p className="text-white/75 text-sm mb-2 truncate">Societies · Projects · Verified Listings</p>
                                <p className="text-white/70 text-sm flex items-center gap-2">
                                  <MapPin className="w-4 h-4" /> View properties in {city.name}
                                </p>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center group-hover:bg-[#029bba] group-hover:border-[#029bba] transition-all duration-300 group-hover:scale-110 flex-shrink-0">
                                <ArrowRight className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="text-center mt-10">
                    <Link href="/properties">
                      <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                        <MapPin className="w-5 h-5" /> Explore All Locations <ArrowRight className="w-5 h-5" />
                      </button>
                    </Link>
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        {/* ── BLOG ── */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium mb-4">
                <Newspaper className="w-4 h-4 inline mr-1" />
                Real Estate Insights
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                <span className="text-[#029bba]">Latest</span> from{' '}
                <span className="text-[#029bba]">Our Blog</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Stay updated with expert analysis, market trends, and property guides.
              </p>
            </div>

            {loadingBlogs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                <span className="ml-2 text-gray-600">Loading articles...</span>
              </div>
            ) : blogs.length > 0 ? (
              <>
                <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  {blogs.map((blog) => (
                    <Link key={blog._id} href={`/blog/${blog.slug || blog._id || '#'}`}>
                      <div className="overflow-hidden bg-white border border-gray-100 hover:border-[#029bba]/30 rounded-2xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(2,155,186,0.15)] flex flex-col h-full">
                        <div className="h-48 overflow-hidden relative">
                          <Image
                            src={blog.image?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'}
                            alt={blog.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="px-3 py-1 bg-gradient-to-r from-[#029bba] to-[#027a94] text-white text-xs font-semibold rounded-full shadow-lg">
                              {blog.category || 'Insights'}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#029bba] transition-colors">
                            {blog.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{blog.excerpt}</p>
                          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-4 h-4" />
                              {new Date(blog.publishedAt || blog.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <span className="text-[#029bba] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                              Read More <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <Link href="/blog">
                    <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                      View All Articles <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Blog Posts Yet</h3>
                <p className="text-gray-600 mb-6">Articles and insights coming soon!</p>
              </div>
            )}
          </div>
        </section>

        {/* ── NEWSLETTER ── */}
        <section className="py-20 bg-gradient-to-br from-[#004063] to-[#002040] relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-l from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium mb-4">
                <Mail className="w-4 h-4" />
                Stay Updated
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                <span className="text-[#06b6d4]">Subscribe</span> to Our{' '}
                <span className="text-[#06b6d4]">Newsletter</span>
              </h2>
              <p className="text-white/70 max-w-xl mx-auto mb-8">
                Get the latest real estate insights and property listings delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                {['Weekly market analysis', 'Exclusive property listings', 'Investment tips from experts'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#06b6d4] flex-shrink-0" />
                    <span className="text-white/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-lg mx-auto bg-white/5 rounded-3xl p-8 backdrop-blur-md border border-white/15">
              <form onSubmit={handleNewsletterSubmit} className="space-y-5">
                <div>
                  <label htmlFor="newsletter-email" className="block text-sm font-medium text-white/80 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
                    <input
                      id="newsletter-email"
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-black/20 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4] outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <Turnstile
                    key={turnstileKey}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                    options={{ theme: 'dark', size: 'normal' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubscribing || !turnstileToken}
                  className="w-full px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#028eaa] hover:to-[#026f86] text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubscribing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Subscribing...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Subscribe Now</>
                  )}
                </button>
              </form>
              <p className="text-xs text-white/50 mt-4 text-center">
                🔒 We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Start Your Journey Today
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              <span className="text-[#029bba]">Ready</span> to Find Your Dream{' '}
              <span className="text-[#029bba]">Property?</span>
            </h2>
            <p className="text-gray-600 mb-10 max-w-2xl mx-auto text-lg">
              Join thousands of satisfied customers who found their perfect home with Highrise.pk
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/properties">
                <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#028eaa] hover:to-[#026f86] text-white font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                  <Search className="w-5 h-5" /> Browse Properties
                </button>
              </Link>
              <button
                onClick={handleListProperty}
                className="px-8 py-4 rounded-xl border-2 border-[#029bba] text-[#029bba] font-bold hover:bg-[#029bba] hover:text-white transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Users className="w-5 h-5" /> List Your Property
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-8 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Verified listings · Trusted developers · Secure platform
            </p>
          </div>
        </section>

        {/* ── TOAST ── */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500/95 border-green-400/50 text-white'
              : toast.type === 'error' ? 'bg-red-500/95 border-red-400/50 text-white'
              : 'bg-[#029bba]/95 border-[#029bba]/50 text-white'
            }`}>
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.type === 'error' && <X className="w-5 h-5" />}
              {toast.type === 'info' && <Shield className="w-5 h-5" />}
              <span className="font-medium text-sm">{toast.message}</span>
            </div>
          </div>
        )}

        {/* ── INLINE SUBSCRIPTION MODAL ── */}
        <SubscriptionInlineModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          type={modalType}
          message={modalMessage}
          email={newsletterEmail}
        />
      </div>
    </>
  );
}