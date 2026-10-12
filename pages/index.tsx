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
import HomeHero from '@/components/home/HomeHero';
import ExplorePropertyTypes from '@/components/home/ExplorePropertyTypes';
import FeaturedProperties from '@/components/home/FeaturedProperties';
import PremiumAdBanner from '@/components/home/PremiumAdBanner';
import IntelligenceTools from '@/components/home/IntelligenceTools';
import InstallmentProperties from '@/components/home/InstallmentProperties';
import VerifiedSocieties from '@/components/home/VerifiedSocieties';
import DeveloperProjects from '@/components/home/DeveloperProjects';
import DevelopersPartners from '@/components/home/DevelopersPartners';
import PopularLocations from '@/components/home/PopularLocations';
import HomeBlog from '@/components/home/HomeBlog';
import HomeNewsletter from '@/components/home/HomeNewsletter';

// ─── Types ────────────────────────────────────────────────────────────────────
function toIdString(v: unknown): string {
  if (v == null) return '';

  // 1. Direct string containing a 24-hex ObjectId
  if (typeof v === 'string') {
    const match = v.match(/[0-9a-fA-F]{24}/);
    if (match) return match[0];
    const trimmed = v.trim();
    return trimmed !== '[object Object]' ? trimmed : '';
  }

  // 2. Object extraction (prioritizing id -> _id -> JSON string scan)
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;

    // Check obj.id first
    if (obj.id) {
      const idStr = toIdString(obj.id);
      if (idStr) return idStr;
    }

    // Check obj._id second
    if (obj._id && obj._id !== v) {
      const idStr = toIdString(obj._id);
      if (idStr) return idStr;
    }

    // Extended JSON {$oid: "..."}
    if (obj.$oid && typeof obj.$oid === 'string') {
      const match = obj.$oid.match(/[0-9a-fA-F]{24}/);
      if (match) return match[0];
    }

    // Full JSON scan fallback for any 24-hex string
    try {
      const jsonStr = JSON.stringify(obj);
      if (jsonStr) {
        const idMatch = jsonStr.match(/"(?:_id|id)":"([0-9a-fA-F]{24})"/);
        if (idMatch && idMatch[1]) return idMatch[1];

        const hexMatch = jsonStr.match(/[0-9a-fA-F]{24}/);
        if (hexMatch) return hexMatch[0];
      }
    } catch {}
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

// Fallback images managed in HomeHero component

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

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getFavoriteKey = (entityType: 'property' | 'project', entityId: string): string =>
    `${entityType}:${entityId}`;

  // ── Effects ────────────────────────────────────────────────────────────────

  // Hero effects moved to HomeHero component

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

  // Banner fetching moved to HomeHero component

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

  // Fetch favorites (only when logged in) — mode=ids is authoritative for heart UI
  const fetchFavorites = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/favorites?mode=ids&_ts=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      const ids: string[] = Array.isArray(data?.data?.propertyIds)
        ? data.data.propertyIds.map((id: unknown) => String(id))
        : [];

      const nextMap: Record<string, boolean> = {};
      ids.forEach((id) => {
        if (id) nextMap[`property:${id}`] = true;
      });
      setFavoriteMap(nextMap);
    } catch {
      // silent
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) fetchFavorites();
  }, [session, fetchFavorites]);

  // Keep homepage hearts in sync with header/card toggles
  useEffect(() => {
    if (!session?.user || typeof window === 'undefined') return;
    const sync = () => {
      void fetchFavorites();
    };
    window.addEventListener('highrise_favorite_updated', sync);
    window.addEventListener('highrise:favorites-changed', sync);
    return () => {
      window.removeEventListener('highrise_favorite_updated', sync);
      window.removeEventListener('highrise:favorites-changed', sync);
    };
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

  // Search handlers moved to HeroSearch component

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

      const isFav = Boolean(data?.data?.isFavorited);
      const actionStr = isFav ? 'added' : 'removed';
      setFavoriteMap((prev) => ({ ...prev, [favoriteKey]: isFav }));
      showToast(isFav ? 'Saved to your list' : 'Removed from saved', 'success');

      // Dispatch global real-time event for Header & other tabs
      try {
        localStorage.setItem(
          'highrise_favorite_toggle',
          JSON.stringify({
            entityType,
            entityId,
            action: actionStr,
            timestamp: Date.now(),
          })
        );
      } catch {}
      window.dispatchEvent(new CustomEvent('highrise_favorite_updated'));
      window.dispatchEvent(new CustomEvent('highrise:favorites-changed'));
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

  // Hero CTA logic moved to HomeHero component

  const handleListProperty = () => {
    if (session?.user) {
      router.push('/add-property');
    } else {
      router.push('/login?redirect=/add-property');
    }
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

        {/* ── NEW ENTERPRISE HERO ── */}
        <HomeHero cities={cities} />

        {/* ── SEO CATEGORY ROW ── */}
        <ExplorePropertyTypes />

        {/* ── FEATURED PROPERTIES ── */}
        <FeaturedProperties 
          properties={featuredProperties} 
          loading={loadingProperties}
          favorites={favoriteMap}
          favoritesLoading={favoriteLoadingMap}
          onFavoriteToggle={handleFavoriteToggle}
          compareHelpers={{ isInCompare, toggleCompare, isMaxReached }}
          showToast={showToast}
        />

        {/* ── PREMIUM INLINE AD STRIP ── */}
        <PremiumAdBanner 
          imageUrl="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80"
          sponsorName="Highrise Enterprise"
          title="Looking to sell faster?"
          subtitle="List your property as a Premium Sponsored Ad to reach thousands of buyers."
          link="/onboarding/business"
        />

        {/* ── INTELLIGENCE TOOL CARDS ── */}
        <IntelligenceTools />

        {/* ── VERIFIED SOCIETIES ── */}
        <VerifiedSocieties
          societies={verifiedSocieties}
          loading={loadingSocieties}
        />

        {/* ── INSTALLMENT PROPERTIES ── */}
        <InstallmentProperties 
          properties={installmentProperties}
          loading={loadingInstallments}
          favorites={favoriteMap}
          favoritesLoading={favoriteLoadingMap}
          onFavoriteToggle={handleFavoriteToggle}
        />

        {/* ── VERIFIED PROJECTS ── */}
        <DeveloperProjects 
          projects={projects}
          loading={loadingProjects}
        />

        {/* ── DEVELOPERS & PARTNERS ── */}
        <DevelopersPartners 
          developers={developers}
          trustedPartners={trustedPartners}
          loadingDevelopers={loadingDevelopers}
          loadingPartners={loadingPartners}
        />

        {/* ── CITIES ── */}
        <PopularLocations 
          cities={cities}
          loading={loadingCities}
        />

        {/* ── BLOG ── */}
        <HomeBlog blogs={blogs} loading={loadingBlogs} />

        {/* ── NEWSLETTER & FINAL CTA ── */}
        <HomeNewsletter 
          email={newsletterEmail}
          setEmail={setNewsletterEmail}
          onSubmit={handleNewsletterSubmit}
          isSubscribing={isSubscribing}
          turnstileKey={turnstileKey}
          setTurnstileToken={setTurnstileToken}
        />

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