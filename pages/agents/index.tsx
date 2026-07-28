// pages/agents/index.tsx
// Public Agents Directory
// ISR + SEO + Lead Capture Modal + PII Protection
// Enterprise: trust-first, audit-trail, no banned libraries

import React, { useState, useCallback, useMemo } from 'react';
import { GetStaticProps } from 'next';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Users,
  ArrowRight,
  CheckCircle2,
  X,
  Briefcase,
  Award,
  Star,
  Phone,
  MessageCircle,
  Home,
  Shield,
  ChevronRight,
  LogIn,
  CheckCircle,
} from 'lucide-react';
import dbConnect from '@/lib/dbConnect';
import AgentProfile from '@/models/AgentProfile';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://highrise.pk';

const PAKISTAN_CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Mardan', 'Gujrat',
  'Kasur', 'Mingora', 'Dera Ghazi Khan', 'Nawabshah', 'Sahiwal',
  'Mirpur', 'Okara', 'Abbottabad', 'Murree', 'Jhelum',
] as const;

const AGENT_TYPES = [
  { value: 'individual', label: 'Individual Agent' },
  { value: 'agency',     label: 'Real Estate Agency' },
  { value: 'freelance',  label: 'Freelance Agent' },
] as const;

const SPECIALIZATIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial',  label: 'Commercial' },
  { value: 'plots',       label: 'Plots & Land' },
  { value: 'rental',      label: 'Rental Properties' },
  { value: 'luxury',      label: 'Luxury' },
] as const;

const ITEMS_PER_PAGE = 12;

// ─── Types ────────────────────────────────────────────────────────────────────

type VerificationLevel =
  | 'not_verified'
  | 'documents_pending'
  | 'basic_verified'
  | 'license_verified'
  | 'full_verified'
  | 'premium_verified';

interface PublicAgent {
  _id:               string;
  slug:              string;
  displayName:       string;
  tagline:           string;
  agentType:         'individual' | 'agency' | 'freelance';
  specializations:   string[];
  agencyName:        string;
  city:              string;
  verificationLevel: VerificationLevel;
  isFeatured:        boolean;
  isPremium:         boolean;
  experience:        { years: number };
  serviceAreas:      { cities: string[]; localities: string[] };
  stats: {
    activeListings:  number;
    soldProperties:  number;
  };
  ratings: {
    averageRating:   number;
    totalReviews:    number;
  };
  profilePhotoUrl:   string;
  coverPhotoUrl:     string;
  // Revealed ONLY from /api/leads POST response after lead capture
  // Never populated from getStaticProps — always empty string at build time
  _contactPhone:     string;
  _contactWhatsapp:  string;
}

interface FilterState {
  search:        string;
  city:          string;
  agentType:     string;
  specialization: string;
  verifiedOnly:  boolean;
}

interface LeadModalState {
  open:             boolean;
  agent:            PublicAgent | null;
  intent:           'call' | 'whatsapp' | null;
  step:             'form' | 'loading' | 'success';
  name:             string;
  phone:            string;
  error:            string;
  revealedPhone:    string;
  revealedWhatsapp: string;
}

interface PageProps {
  agents:     PublicAgent[];
  totalCount: number;
}

// ─── Verification Badge ───────────────────────────────────────────────────────

const VERIFICATION_CONFIG: Record<
  VerificationLevel,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> | null }
> = {
  not_verified:       { label: '',               className: '',                                                    Icon: null         },
  documents_pending:  { label: 'Pending',         className: 'bg-amber-100 border-amber-200 text-amber-700',        Icon: ShieldCheck   },
  basic_verified:     { label: 'Basic',           className: 'bg-blue-100 border-blue-200 text-blue-700',           Icon: CheckCircle2  },
  license_verified:   { label: 'Licensed',        className: 'bg-[#029bba]/10 border-[#029bba]/20 text-[#029bba]', Icon: ShieldCheck   },
  full_verified:      { label: 'Verified',        className: 'bg-green-100 border-green-200 text-green-700',        Icon: ShieldCheck   },
  premium_verified:   { label: 'Premium',         className: 'bg-purple-100 border-purple-200 text-purple-700',     Icon: Award         },
};

function VerificationBadge({ level }: { level: VerificationLevel }): React.ReactElement | null {

  const config = VERIFICATION_CONFIG[level];
  if (!config.label || !config.Icon) return null;
  const { Icon } = config;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full 
                  text-[10px] font-bold uppercase border ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function RatingBadge({ rating, reviews }: { rating: number; reviews: number }): React.ReactElement {

  return (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      <span className="font-bold text-gray-900 text-sm">{rating.toFixed(1)}</span>
      <span className="text-gray-400 text-xs">({reviews})</span>
    </div>
  );
}

// ─── Agent Avatar ─────────────────────────────────────────────────────────────

function AgentAvatar({
  url,
  name,
  size = 64,
  className = '',
}: {
  url: string;
  name: string;
  size?: number;
  className?: string;
}): React.ReactElement {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        fill
        className={`object-cover ${className}`}
        sizes={`${size}px`}
      />
    );
  }
  return (
    <div
      className={`w-full h-full flex items-center justify-center 
                  bg-gradient-to-br from-[#029bba] to-[#004063] 
                  text-white font-bold text-xl ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard(): React.ReactElement {

  return (
    <div className="h-96 bg-white rounded-2xl border border-gray-100 animate-pulse p-6">
      <div className="flex justify-between mb-6">
        <div className="w-16 h-16 bg-gray-200 rounded-xl" />
        <div className="w-20 h-8 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="h-16 bg-gray-200 rounded-lg" />
        <div className="h-16 bg-gray-200 rounded-lg" />
        <div className="h-16 bg-gray-200 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onContact,
}: {
  agent:     PublicAgent;
  onContact: (agent: PublicAgent, intent: 'call' | 'whatsapp') => void;
}): React.ReactElement {
  return (
    <div className="group relative h-full bg-white rounded-2xl border border-gray-200 
                    overflow-hidden hover:shadow-xl hover:border-[#029bba]/30 
                    hover:-translate-y-1 transition-all duration-300 flex flex-col">

      {/* Featured Badge */}
      {agent.isFeatured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="px-2 py-1 bg-amber-500 text-white text-[10px] 
                           font-bold uppercase rounded-lg">
            ⭐ Featured
          </span>
        </div>
      )}

      {/* Card Header */}
      <div className="p-6 pb-4 flex items-start justify-between gap-4">
        {/* Profile Photo */}
        <div className="relative w-16 h-16 rounded-xl border border-gray-100 
                        bg-white shadow-sm overflow-hidden flex-shrink-0">
          <AgentAvatar
            url={agent.profilePhotoUrl}
            name={agent.displayName}
            size={64}
          />
        </div>

        {/* Rating + Badge */}
        <div className="flex flex-col items-end gap-1">
          <RatingBadge
            rating={agent.ratings?.averageRating ?? 0}
            reviews={agent.ratings?.totalReviews ?? 0}
          />
          <VerificationBadge level={agent.verificationLevel} />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 flex-1">
        {/* Name */}
        <Link href={`/agent/${agent.slug}`}>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#029bba] 
                         transition-colors line-clamp-1 mb-1">
            {agent.displayName}
          </h3>
        </Link>

        {/* Agency */}
        {agent.agencyName && (
          <p className="text-sm text-gray-500 mb-2 line-clamp-1">
            {agent.agencyName}
          </p>
        )}

        {/* Location + Type */}
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {agent.city ?? 'Pakistan'}
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
          <span className="capitalize">{agent.agentType ?? 'Agent'}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { value: agent.stats?.activeListings ?? 0,  label: 'Listings' },
            { value: agent.stats?.soldProperties  ?? 0,  label: 'Sold'     },
            { value: `${agent.experience?.years ?? 0}+`, label: 'Years'    },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-lg p-2.5 text-center"
            >
              <span className="block text-lg font-bold text-gray-900">
                {value}
              </span>
              <span className="text-[10px] text-gray-500 uppercase 
                               tracking-wide font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Specializations */}
        {agent.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {agent.specializations.slice(0, 3).map((spec) => (
              <span
                key={spec}
                className="px-2 py-0.5 bg-[#029bba]/10 text-[#029bba] 
                           text-[10px] font-medium rounded-full capitalize"
              >
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contact Buttons — no phone in DOM */}
      <div className="px-6 pb-4 flex gap-2">
        <button
          onClick={() => onContact(agent, 'call')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 
                     bg-[#029bba] text-white rounded-xl text-sm font-medium 
                     hover:bg-[#027a94] transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call
        </button>
        {agent._contactWhatsapp && (
          <button
            onClick={() => onContact(agent, 'whatsapp')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 
                       bg-[#25D366] text-white rounded-xl text-sm font-medium 
                       hover:bg-[#128C7E] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        )}
      </div>

      {/* Footer */}
      <Link
        href={`/agent/${agent.slug}`}
        className="px-6 py-4 bg-gray-50 border-t border-gray-100 
                   flex items-center justify-between 
                   group-hover:bg-[#029bba]/5 transition-colors"
      >
        <span className="text-sm font-medium text-gray-600 
                         group-hover:text-[#029bba]">
          View Full Profile
        </span>
        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 
                        flex items-center justify-center text-gray-400 
                        group-hover:border-[#029bba] group-hover:text-[#029bba] 
                        transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </Link>
    </div>
  );
}

// ─── Lead Capture Modal ───────────────────────────────────────────────────────

function LeadModal({
  state,
  session,
  onClose,
  onSubmit,
  onChange,
}: {
  state:     LeadModalState;
  session:   ReturnType<typeof useSession>['data'];
  onClose:   () => void;
  onSubmit:  () => void;
  onChange:  (field: 'name' | 'phone', value: string) => void;
}): React.ReactElement | null {
  if (!state.open || !state.agent) return null;

  const isLoggedIn     = !!session?.user;
  const intentLabel    = state.intent === 'call' ? 'Call' : 'WhatsApp';
  const whatsappUrl    = state.revealedWhatsapp
    ? `https://wa.me/92${state.revealedWhatsapp
        .replace(/^0/, '')
        .replace(/[^0-9]/g, '')}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center 
                 justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl 
                      sm:rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <AgentAvatar
                url={state.agent.profilePhotoUrl}
                name={state.agent.displayName}
                size={40}
                className="text-sm"
              />
            </div>
            <div>
              <p
                id="lead-modal-title"
                className="font-semibold text-[#004063] text-sm"
              >
                {state.agent.displayName}
              </p>
              <p className="text-xs text-gray-500">{state.agent.city}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* ── Guest — Not Logged In ── */}
          {!isLoggedIn && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#029bba]/10 rounded-full flex items-center 
                              justify-center mx-auto mb-4">
                <LogIn className="w-7 h-7 text-[#029bba]" />
              </div>
              <h3 className="font-semibold text-[#004063] mb-2">
                Sign in to {intentLabel} Agent
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Create a free account to connect with verified agents and
                track your property search.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/login?redirect=/agents"
                  className="w-full py-3 bg-[#029bba] text-white rounded-xl 
                             text-sm font-semibold hover:bg-[#027a94] 
                             transition-colors text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register?redirect=/agents"
                  className="w-full py-3 border border-[#029bba] text-[#029bba] 
                             rounded-xl text-sm font-semibold 
                             hover:bg-[#029bba]/5 transition-colors text-center"
                >
                  Create Free Account
                </Link>
              </div>
              <div className="flex items-center gap-2 mt-5 p-3 bg-green-50 rounded-xl">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700 text-left">
                  Your information is encrypted and never shared with third parties.
                </p>
              </div>
            </div>
          )}

          {/* ── Logged In: Form ── */}
          {isLoggedIn && state.step === 'form' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Confirm your details to {intentLabel.toLowerCase()}&nbsp;
                <span className="font-medium text-[#004063]">
                  {state.agent.displayName}
                </span>
              </p>

              {state.error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                  <p className="text-sm text-red-700">{state.error}</p>
                </div>
              )}

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg 
                               text-sm focus:ring-2 focus:ring-[#029bba] 
                               focus:border-transparent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={state.phone}
                    onChange={(e) => onChange('phone', e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg 
                               text-sm focus:ring-2 focus:ring-[#029bba] 
                               focus:border-transparent outline-none transition-shadow"
                  />
                </div>
              </div>

              <button
                onClick={onSubmit}
                className="w-full py-3 bg-[#029bba] text-white rounded-xl text-sm 
                           font-semibold hover:bg-[#027a94] transition-colors 
                           flex items-center justify-center gap-2"
              >
                {state.intent === 'call' ? (
                  <><Phone className="w-4 h-4" /> Get Phone Number</>
                ) : (
                  <><MessageCircle className="w-4 h-4" /> Open WhatsApp</>
                )}
              </button>

              <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-xl">
                <Shield className="w-4 h-4 text-[#029bba] flex-shrink-0" />
                <p className="text-xs text-[#029bba]">
                  Your inquiry is logged securely. We never share your details
                  without consent.
                </p>
              </div>
            </>
          )}

          {/* ── Loading ── */}
          {isLoggedIn && state.step === 'loading' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[#029bba]/20 
                              border-t-[#029bba] rounded-full animate-spin 
                              mx-auto mb-4" />
              <p className="text-sm text-gray-500">Connecting you...</p>
            </div>
          )}

          {/* ── Success ── */}
          {isLoggedIn && state.step === 'success' && (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center 
                              justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-[#004063] mb-1">
                Contact Details Ready
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Your inquiry has been recorded
              </p>

              <div className="space-y-3">
                {state.revealedPhone && (
                  <a
                    href={`tel:${state.revealedPhone}`}
                    className="flex items-center justify-between w-full px-4 py-3 
                               bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] 
                               transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-xs opacity-80">Phone</p>
                        <p className="font-semibold tracking-wide">
                          {state.revealedPhone}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70 
                                             group-hover:translate-x-1 
                                             transition-transform" />
                  </a>
                )}

                {state.revealedWhatsapp && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full px-4 py-3 
                               bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] 
                               transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-xs opacity-80">WhatsApp</p>
                        <p className="font-semibold">Open Chat</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70 
                                             group-hover:translate-x-1 
                                             transition-transform" />
                  </a>
                )}

                <Link
                  href={`/agent/${state.agent.slug}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 
                             border border-gray-200 text-gray-700 rounded-xl 
                             hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  View Full Profile
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter Tag ───────────────────────────────────────────────────────────────

function FilterTag({
  label,
  onRemove,
}: {
  label:    string;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 
                     bg-[#029bba]/10 text-[#029bba] rounded-full 
                     text-sm font-medium">
      {label}
       <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:text-red-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AgentsDirectoryPage({
  agents,
  totalCount,
}: Omit<PageProps, 'lastUpdated'>): React.ReactElement {
  const { data: session } = useSession();

  // ── Filter State ──
  const [filters, setFilters] = useState<FilterState>({
    search:         '',
    city:           '',
    agentType:      '',
    specialization: '',
    verifiedOnly:   false,
  });
  const [page, setPage]             = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);

  // ── Lead Modal ──
  const [modal, setModal] = useState<LeadModalState>({
    open:             false,
    agent:            null,
    intent:           null,
    step:             'form',
    name:             '',
    phone:            '',
    error:            '',
    revealedPhone:    '',
    revealedWhatsapp: '',
  });

  // ── Filter Logic ──
  const allFiltered = useMemo<PublicAgent[]>(() => {
    let result = [...agents];

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.displayName?.toLowerCase().includes(q) ||
          a.agencyName?.toLowerCase().includes(q) ||
          a.city?.toLowerCase().includes(q) ||
          a.serviceAreas?.localities?.some((l) =>
            l.toLowerCase().includes(q)
          )
      );
    }
    if (filters.city) {
      result = result.filter(
        (a) =>
          a.city?.toLowerCase() === filters.city.toLowerCase() ||
          a.serviceAreas?.cities?.some(
            (c) => c.toLowerCase() === filters.city.toLowerCase()
          )
      );
    }
    if (filters.agentType) {
      result = result.filter((a) => a.agentType === filters.agentType);
    }
    if (filters.specialization) {
      result = result.filter((a) =>
        a.specializations?.includes(filters.specialization)
      );
    }
    if (filters.verifiedOnly) {
      result = result.filter(
        (a) =>
          a.verificationLevel === 'full_verified' ||
          a.verificationLevel === 'premium_verified' ||
          a.verificationLevel === 'license_verified'
      );
    }

    return result;
  }, [agents, filters]);
  const paginated    = allFiltered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore      = paginated.length < allFiltered.length;

  const hasActiveFilters =
    !!filters.search.trim() || !!filters.city ||
    !!filters.agentType    || !!filters.specialization ||
    filters.verifiedOnly;

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setIsFiltering(true);
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setTimeout(() => setIsFiltering(false), 150);
  };

  const clearAllFilters = () => {
    setFilters({
      search: '', city: '', agentType: '',
      specialization: '', verifiedOnly: false,
    });
    setPage(1);
  };

  // ── Modal Handlers ──
  const openModal = useCallback(
    (agent: PublicAgent, intent: 'call' | 'whatsapp') => {
      setModal({
        open:             true,
        agent,
        intent,
        step:             'form',
        name:             session?.user?.name ?? '',
        phone:            '',
        error:            '',
        revealedPhone:    '',
        revealedWhatsapp: '',
      });
    },
    [session]
  );

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, open: false }));
  }, []);

  const handleModalChange = useCallback(
    (field: 'name' | 'phone', value: string) => {
      setModal((prev) => ({ ...prev, [field]: value, error: '' }));
    },
    []
  );

  const handleModalSubmit = useCallback(async () => {
    if (!modal.agent) return;

    if (!modal.name.trim()) {
      setModal((prev) => ({ ...prev, error: 'Please enter your name.' }));
      return;
    }
    const phoneClean = modal.phone.trim().replace(/[-\s]/g, '');
    if (!/^(03\d{9}|\+923\d{9})$/.test(phoneClean)) {
      setModal((prev) => ({
        ...prev,
        error: 'Please enter a valid Pakistani mobile number (e.g. 03XX-XXXXXXX).',
      }));
      return;
    }

    setModal((prev) => ({ ...prev, step: 'loading', error: '' }));

    // Optimistic — fire and don't block on result
    try {
       await fetch('/api/leads', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId:      modal.agent._id,
          agentSlug:    modal.agent.slug,
          intent:       modal.intent,
          visitorName:  modal.name.trim(),
          visitorPhone: phoneClean,
          source:       'agents_directory',
        }),
      });
    } catch {
      // Graceful — always reveal
    }

    // Contact details come from API response — never from static props
    setModal((prev) => ({
      ...prev,
      step:             'success',
      revealedPhone:    '',    // TODO: populate from /api/leads response body
      revealedWhatsapp: '',    // TODO: populate from /api/leads response body
    }));
  }, [modal]);

  // ── JSON-LD ──
  const jsonLd = {
    '@context':     'https://schema.org',
    '@type':        'ItemList',
    name:           'Verified Real Estate Agents in Pakistan — Highrise.pk',
    description:    'Directory of KYC-verified property agents across Pakistan',
    url:            `${APP_URL}/agents`,
    numberOfItems:  totalCount,
    itemListElement: agents.slice(0, 10).map((agent, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      item: {
        '@type': 'RealEstateAgent',
        '@id':   `${APP_URL}/agent/${agent.slug}`,
        name:    agent.displayName,
        url:     `${APP_URL}/agent/${agent.slug}`,
        image:   agent.profilePhotoUrl || undefined,
        address: {
          '@type':           'PostalAddress',
          addressLocality:   agent.city ?? 'Pakistan',
          addressCountry:    'PK',
        },
        ...(agent.ratings?.totalReviews > 0 && {
          aggregateRating: {
            '@type':       'AggregateRating',
            ratingValue:   agent.ratings.averageRating,
            reviewCount:   agent.ratings.totalReviews,
            bestRating:    5,
            worstRating:   1,
          },
        }),
      },
    })),
  };

  return (
    <>
      <Head>
        <title>Find Verified Real Estate Agents in Pakistan | Highrise.pk</title>
        <meta
          name="description"
          content="Find trusted KYC-verified real estate agents in Pakistan. Browse agents by city, specialization and ratings. Connect with property experts in Karachi, Lahore, Islamabad."
        />
        <meta
          name="keywords"
          content="real estate agents pakistan, property agents, verified agents, karachi agents, lahore agents, islamabad agents, property dealers"
        />
        <link rel="canonical" href={`${APP_URL}/agents`} />
        <meta name="robots" content="index, follow" />
        <meta name="geo.region"    content="PK" />
        <meta name="geo.placename" content="Pakistan" />

        {/* OG */}
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content={`${APP_URL}/agents`} />
        <meta property="og:title"       content="Find Verified Real Estate Agents in Pakistan | Highrise.pk" />
        <meta property="og:description" content="Connect with trusted property experts across Pakistan." />
        <meta property="og:image"       content={`${APP_URL}/og-agents.jpg`} />
        <meta property="og:site_name"   content="Highrise.pk" />

        {/* Twitter */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Find Verified Agents | Highrise.pk" />
        <meta name="twitter:description" content="KYC-verified agents across Pakistan." />
        <meta name="twitter:image"       content={`${APP_URL}/og-agents.jpg`} />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── Hero ── */}
        <section className="relative bg-[#001f2b] text-white pt-16 pb-32 overflow-hidden">
          {/* Dot pattern — bg-image not allowed as inline, use pseudo via Tailwind */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#029bba_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#029bba] rounded-full 
                          blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#029bba] rounded-full 
                          blur-[100px] opacity-10 -translate-x-1/2 translate-y-1/2" />

          <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center justify-center gap-2 
                         text-sm text-white/60 mb-4"
            >
              <Link
                href="/"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-white" aria-current="page">Agents</span>
            </nav>

            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full 
                            bg-white/10 border border-white/20 text-xs font-medium 
                            text-[#4dd6f5] mb-6 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              {totalCount} KYC-Verified Property Experts
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 
                           tracking-tight leading-tight">
              Find{' '}
              <span className="text-[#029bba]">Trusted</span>{' '}
              Real Estate
              <br className="hidden md:block" />
              Agents in Pakistan
            </h1>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect with verified property experts who can help you buy,
              sell, or rent properties across Pakistan.
            </p>
          </div>
        </section>

        {/* ── Search & Filters Card ── */}
        <div className="container mx-auto px-4 -mt-12 relative z-20 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 
                          p-4 md:p-6 max-w-5xl mx-auto">

            {/* Search Row */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 
                                   w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search by name, city or agency..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  aria-label="Search agents"
                  className="block w-full h-14 pl-11 pr-4 bg-gray-50 border 
                             border-gray-100 rounded-xl text-gray-900 
                             placeholder-gray-400 focus:ring-2 
                             focus:ring-[#029bba] focus:border-[#029bba] 
                             focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">

                {/* Verified Toggle */}
                <label className="flex items-center gap-2 h-12 px-3 bg-gray-50 
                                  rounded-xl border border-gray-100 cursor-pointer 
                                  select-none">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => updateFilter('verifiedOnly', e.target.checked)}
                      className="sr-only peer"
                      aria-label="Verified agents only"
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full 
                                    peer-checked:bg-[#029bba] transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white 
                                    rounded-full shadow peer-checked:translate-x-4 
                                    transition-transform" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 
                                   flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#029bba]" />
                    Verified Only
                  </span>
                </label>

                {/* City */}
                <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 
                                rounded-xl border border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={filters.city}
                    onChange={(e) => updateFilter('city', e.target.value)}
                    aria-label="Filter by city"
                    className="w-full bg-transparent border-none text-sm 
                               text-gray-700 focus:ring-0 focus:outline-none 
                               cursor-pointer"
                  >
                    <option value="">All Cities</option>
                    {PAKISTAN_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Agent Type */}
                <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 
                                rounded-xl border border-gray-100">
                  <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={filters.agentType}
                    onChange={(e) => updateFilter('agentType', e.target.value)}
                    aria-label="Filter by agent type"
                    className="w-full bg-transparent border-none text-sm 
                               text-gray-700 focus:ring-0 focus:outline-none 
                               cursor-pointer"
                  >
                    <option value="">All Types</option>
                    {AGENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Specialization */}
                <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 
                                rounded-xl border border-gray-100">
                  <Award className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={filters.specialization}
                    onChange={(e) => updateFilter('specialization', e.target.value)}
                    aria-label="Filter by specialization"
                    className="w-full bg-transparent border-none text-sm 
                               text-gray-700 focus:ring-0 focus:outline-none 
                               cursor-pointer"
                  >
                    <option value="">All Specializations</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filter Tags */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {filters.search && (
                    <FilterTag
                      label={`Search: "${filters.search}"`}
                      onRemove={() => updateFilter('search', '')}
                    />
                  )}
                  {filters.city && (
                    <FilterTag
                      label={`City: ${filters.city}`}
                      onRemove={() => updateFilter('city', '')}
                    />
                  )}
                  {filters.agentType && (
                    <FilterTag
                      label={AGENT_TYPES.find((t) => t.value === filters.agentType)?.label ?? filters.agentType}
                      onRemove={() => updateFilter('agentType', '')}
                    />
                  )}
                  {filters.specialization && (
                    <FilterTag
                      label={SPECIALIZATIONS.find((s) => s.value === filters.specialization)?.label ?? filters.specialization}
                      onRemove={() => updateFilter('specialization', '')}
                    />
                  )}
                  {filters.verifiedOnly && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 
                                     bg-green-100 text-green-700 rounded-full 
                                     text-sm font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Only
                      <button
                        type="button"
                        onClick={() => updateFilter('verifiedOnly', false)}
                        aria-label="Remove verified filter"
                        className="hover:text-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                 <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm text-gray-500 hover:text-red-600 
                               px-3 py-1 rounded-lg hover:bg-red-50 
                               transition-colors flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <main className="container mx-auto px-4 pb-12">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row sm:items-center 
                          justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-[#029bba] w-6 h-6" />
                {hasActiveFilters ? 'Filtered Results' : 'Top Rated Agents'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {hasActiveFilters
                  ? `Found ${allFiltered.length} agent${allFiltered.length !== 1 ? 's' : ''} matching your criteria`
                  : `Showing ${paginated.length} of ${agents.length} agents`}
              </p>
            </div>
          </div>

          {/* Skeleton */}
          {isFiltering ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
            </div>
          ) : paginated.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map((agent) => (
                  <AgentCard
                    key={agent._id}
                    agent={agent}
                    onContact={openModal}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center mt-10">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className="px-8 py-3 border border-[#029bba] text-[#029bba] 
                               rounded-xl text-sm font-semibold hover:bg-[#029bba] 
                               hover:text-white transition-colors"
                  >
                    Load More Agents
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Showing {paginated.length} of {allFiltered.length} agents
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-20 bg-white rounded-2xl 
                            border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center 
                              justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Agents Found
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search terms'
                  : 'No agents are available at the moment. Check back soon.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-[#029bba] text-white rounded-xl 
                             text-sm font-medium hover:bg-[#027a94] 
                             transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </main>

        {/* ── CTA Section ── */}
        <section className="relative bg-[#001f2b] text-white py-20 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#029bba_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="absolute top-0 left-1/2 w-96 h-96 bg-[#029bba] 
                          rounded-full blur-[150px] opacity-20 
                          -translate-x-1/2 -translate-y-1/2" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl 
                            bg-gradient-to-br from-[#029bba] to-[#004063] 
                            flex items-center justify-center shadow-xl">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              Are You a Real Estate Professional?
            </h2>
            <p className="text-gray-400 mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
              Join Highrise.pk and connect with thousands of property buyers
              and sellers across Pakistan.
            </p>
            <Link
              href="/agent/register"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#029bba] 
                         to-[#004063] text-white rounded-xl text-lg font-semibold 
                         shadow-lg hover:opacity-90 transition-opacity"
            >
              Register as Agent
            </Link>

            {/* Trust Indicators */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 
                            text-sm text-gray-500">
              {[
                'Free Registration',
                'Verified Badge',
                'Unlimited Listings',
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Lead Modal ── */}
      <LeadModal
        state={modal}
        session={session}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        onChange={handleModalChange}
      />
    </>
  );
}

// ─── ISR Data Fetching ────────────────────────────────────────────────────────

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  try {
    await dbConnect();

    const rawAgents = await AgentProfile.find(
      { status: 'approved' },
      {
        slug:              1,
        displayName:       1,
        tagline:           1,
        agentType:         1,
        specializations:   1,
        agencyName:        1,
        city:              1,
        verificationLevel: 1,
        isFeatured:        1,
        isPremium:         1,
        experience:        1,
        serviceAreas:      1,
        stats:             1,
        ratings:           1,
        'documents.profilePhoto.url': 1,
        'documents.coverPhoto.url':   1,
      }
    )
      .sort({
        isFeatured:               -1,
        isPremium:                -1,
        'ratings.averageRating':  -1,
      })
      .lean()
      .exec();

    const agents: PublicAgent[] = (
      rawAgents as Record<string, unknown>[]
    ).map((a) => {
      const docs =
        (a.documents as Record<string, { url?: string }> | undefined) ?? {};
      const exp  = a.experience  as { years?: number }         | undefined;
      const sa   = a.serviceAreas as { cities?: string[]; localities?: string[] } | undefined;
      const st   = a.stats        as { activeListings?: number; soldProperties?: number } | undefined;
      const rt   = a.ratings      as { averageRating?: number; totalReviews?: number } | undefined;

      return {
        _id:               String(a._id),
        slug:              String(a.slug            ?? ''),
        displayName:       String(a.displayName     ?? ''),
        tagline:           String(a.tagline         ?? ''),
        agentType:         (a.agentType as PublicAgent['agentType']) ?? 'individual',
        specializations:   Array.isArray(a.specializations)
                             ? (a.specializations as string[])
                             : [],
        agencyName:        String(a.agencyName      ?? ''),
        city:              String(a.city            ?? ''),
        verificationLevel: (a.verificationLevel as VerificationLevel) ?? 'not_verified',
        isFeatured:        Boolean(a.isFeatured),
        isPremium:         Boolean(a.isPremium),
        experience:        { years: Number(exp?.years ?? 0) },
        serviceAreas: {
          cities:     Array.isArray(sa?.cities)     ? (sa!.cities as string[])     : [],
          localities: Array.isArray(sa?.localities) ? (sa!.localities as string[]) : [],
        },
        stats: {
          activeListings: Number(st?.activeListings ?? 0),
          soldProperties: Number(st?.soldProperties ?? 0),
        },
        ratings: {
          averageRating: Number(rt?.averageRating ?? 0),
          totalReviews:  Number(rt?.totalReviews  ?? 0),
        },
        profilePhotoUrl:   docs.profilePhoto?.url ?? '',
        coverPhotoUrl:     docs.coverPhoto?.url   ?? '',
        // Phone/WhatsApp revealed ONLY via /api/leads after lead capture
        _contactPhone:    '',
        _contactWhatsapp: '',
      };
    });

    return {
       props: {
        agents,
        totalCount: agents.length,
      },
      revalidate: 60,
    };
 } catch {
    return {
       props: { agents: [], totalCount: 0 },
      revalidate: 30,
    };
  }
};