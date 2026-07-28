// pages/admin/agents/[id].tsx
// Highrise.pk — Admin Agent Detail & Review Page
// NO AdminGuard | NO double layout | NO alert() | NO confirm()
// useSession() guard | inline banners | inline modals
// credentials: 'include' on all fetch calls

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  ArrowLeft,
  ExternalLink,
  FileText,
  Shield,
  Star,
  Award,
  MapPin,
  Mail,
  Activity,
  RefreshCw,
  TrendingUp,
  Info,
  MessageSquare,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  // V6.9.4: New icons for reviews UI redesign
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import OfficeMapPreview from '@/components/OfficeMapPreview';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_required';
type VerificationLevel =
  | 'not_verified'
  | 'documents_pending'
  | 'basic_verified'
  | 'license_verified'
  | 'full_verified'
  | 'premium_verified';

interface AgentUser {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
}

interface Agent {
  _id: string;
  displayName: string;
  agentType: 'individual' | 'agency' | 'freelance';
  agencyName?: string;
  agencySize?: string;
  tagline?: string;
  about?: string;
  city: string;
  operatingCities: string[];
  email: string;
  status: AgentStatus;
  verificationLevel: VerificationLevel;
  verifiedAt?: string;
  rejectionReason?: string;
  slug?: string;
  isPremium: boolean;
  premiumTier?: string;
  isFeatured: boolean;
  isAvailable: boolean;
  badges: string[];

  // V6.8.4: Service coverage areas
  serviceAreas?: {
    cities?:     string[];
    localities?: string[];
  };

  // V6.8.8: Admin-curated reviews (embedded)
  // V6.9.4: Added editedAt + editedBy for edit tracking
  reviews?: Array<{
    _id?:            string;
    rating:          number;
    reviewText:      string;
    reviewerName:    string;
    reviewerCity?:   string;
    source:          'admin_verified' | 'client_testimonial' | 'post_transaction' | 'highrise_investigation';
    adminNotes?:     string;
    addedAt:         string;
    addedBy?:        string;
    editedAt?:       string;   // V6.9.4: Set when review is edited via PATCH
    editedBy?:       string;   // V6.9.4: Admin ID who made the edit
    isPublished:     boolean;
    transactionRef?: string;
  }>;

  cnicVerified: boolean;
  licenseVerified: boolean;
  ntnVerified: boolean;
  secpVerified: boolean;
  licenseIssuer?: string;
  languages: string[];
  specializations: string[];

  // V6.8.4: Business Compliance (FULL decrypted values from API)
  // Admin sees full values to verify against uploaded document images
  cnicNumber?:         string;   // e.g. "3520212345678" (full)
  ntnNumber?:          string;   // e.g. "1234567" (full)
  licenseNumber?:      string;   // e.g. "PKR12345KA" (full)
  phoneNumber?:        string;   // e.g. "+923001234567" (full)
  whatsappNumber?:     string;   // e.g. "+923001234567" (full)
  companyRegNo?:       string;   // e.g. "LLP-12345" (visible)
  licenseDocumentUrl?: string;

  // V6.8.4: Additional agent fields (from onboarding form)
  representativeName?: string;
  representativeRole?: string;
  contactEmail?:       string;   // Alternative business email
  experience: {
    years: number;
    totalDeals?: number;
    totalValue?: number;
  };
  stats: {
    activeListings: number;
    totalListings: number;
    soldProperties: number;
    rentedProperties: number;
    totalLeads?: number;
    convertedLeads?: number;
    responseRate?: number;
    averageResponseTime?: number;
  };
  ratings: {
    averageRating: number;
    totalReviews: number;
  };
  trustScore: {
    overall: number;
    breakdown: Record<string, number>;
    lastCalculated: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
  };
  documents: {
    profilePhoto?: { url?: string; publicId?: string; uploadedAt?: string };
    coverPhoto?:   { url?: string; publicId?: string; uploadedAt?: string };
    cnicFront?:    { url?: string; publicId?: string; uploadedAt?: string };
    cnicBack?:     { url?: string; publicId?: string; uploadedAt?: string };
    license?:      { url?: string; publicId?: string; issuer?: string; expiresAt?: string };
  };
  agencyLogo?: { url?: string; publicId?: string };
  officeVerification?: {
    address: string;
    city: string;
    verifiedAt?: string;
    isActive: boolean;
    // V6.9.0: Coordinates from interactive map picker
    // Passed to OfficeMapPreview to show EXACT GPS pin (not geocoded approximation)
    coordinates?: {
      latitude:  number;
      longitude: number;
    };
  };
  memberSince: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  suspensionReason?: string;
  user?: AgentUser;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }): React.ReactElement {
  const config: Record<AgentStatus, { bg: string; text: string; dot: string; label: string }> = {
    draft:          { bg: 'bg-gray-100',    text: 'text-gray-700',    dot: 'bg-gray-400',    label: 'Draft'          },
    pending:        { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500',   label: 'Pending'        },
    approved:       { bg: 'bg-[#f0fdf4]',  text: 'text-[#10b981]',  dot: 'bg-[#10b981]',  label: 'Approved'       },
    rejected:       { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rejected'       },
    suspended:      { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'Suspended'      },
    info_required:  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Info Required'  },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}): React.ReactElement {
  const display =
    value === true ? 'Yes' :
    value === false ? 'No' :
    value !== undefined && value !== null && value !== '' ? String(value) : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500 sm:w-1/3 mb-1 sm:mb-0 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 sm:w-2/3 break-words">
        {display ?? <span className="text-gray-400 italic">Not provided</span>}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-[#004063]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function DocumentCard({ title, url }: { title: string; url?: string }): React.ReactElement {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-xs text-gray-400 italic">Not uploaded</p>
      </div>
    );
  }
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPDF   = url.toLowerCase().includes('.pdf');
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
      {isImage && (
        <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-100 mb-3">
          <Image src={url} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain bg-gray-50" />
        </div>
      )}
      {isPDF && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-3">
          <FileText className="w-6 h-6 text-red-500 shrink-0" />
          <span className="text-sm text-gray-600">PDF Document</span>
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#029bba] hover:text-[#027a94] transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View Document
      </a>
    </div>
  );
}

// V6.8.7: Interactive verification toggle button
function VerificationToggle({
  verified,
  label,
  item,
  loading,
  onToggle,
  disabled,
}: {
  verified: boolean;
  label:    string;
  item:     'cnic' | 'license' | 'ntn' | 'secp';
  loading:  boolean;
  onToggle: (item: 'cnic' | 'license' | 'ntn' | 'secp', newVerified: boolean) => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <div className={`flex flex-col p-3 rounded-xl border-2 transition-all ${
      verified
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Status display */}
      <div className="flex items-center gap-2 mb-2">
        {verified ? (
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{label}</p>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${
            verified ? 'text-emerald-600' : 'text-gray-500'
          }`}>
            {verified ? 'Verified' : 'Not Verified'}
          </p>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={() => onToggle(item, !verified)}
        disabled={loading || disabled}
        className={`w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          verified
            ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
            : 'bg-emerald-500 text-white hover:bg-emerald-600'
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Updating...
          </span>
        ) : verified ? (
          'Mark Unverified'
        ) : (
          '✓ Mark Verified'
        )}
      </button>
    </div>
  );
}

// V6.8.4: Format CNIC as 00000-0000000-0 for readability
function formatCnicDisplay(cnic?: string | null): string {
  if (!cnic || cnic === 'Not provided') return 'Not provided';
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return cnic; // Return as-is if unexpected
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

// V6.8.4: Format phone as +92 3XX XXXX XXX for readability
function formatPhoneDisplay(phone?: string | null): string {
  if (!phone || phone === 'Not provided') return 'Not provided';
  const clean = phone.replace(/\s+/g, '');
  if (clean.startsWith('+92') && clean.length === 13) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)} ${clean.slice(10)}`;
  }
  return phone;
}

// V6.9.4: Review UI helpers ─────────────────────────────────────
// Source labels for pretty display
const REVIEW_SOURCE_LABELS: Record<string, string> = {
  admin_verified:         'Admin Verified',
  client_testimonial:     'Testimonial',
  post_transaction:       'Post-Deal',
  highrise_investigation: 'Investigation',
};

// Source colors (for filter chips)
const REVIEW_SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin_verified:         { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  client_testimonial:     { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  post_transaction:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  highrise_investigation: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
};

// Sort options
type ReviewSortKey = 'newest' | 'oldest' | 'highest' | 'lowest' | 'edited';

const REVIEW_SORT_OPTIONS: Array<{ key: ReviewSortKey; label: string }> = [
  { key: 'newest',  label: 'Newest First'      },
  { key: 'oldest',  label: 'Oldest First'      },
  { key: 'highest', label: 'Highest Rated'     },
  { key: 'lowest',  label: 'Lowest Rated'      },
  { key: 'edited',  label: 'Recently Edited'   },
];

// Filter state type
interface ReviewFilters {
  search:      string;
  rating:      number | null;    // 1-5 or null for all
  source:      string | null;    // source key or null for all
  visibility:  'all' | 'public' | 'hidden';
  sort:        ReviewSortKey;
  page:        number;
}

// Default filter state
const DEFAULT_REVIEW_FILTERS: ReviewFilters = {
  search:     '',
  rating:     null,
  source:     null,
  visibility: 'all',
  sort:       'newest',
  page:       1,
};

const REVIEWS_PER_PAGE = 10;

// V6.8.4: Compliance Row — displays FULL KYC identifiers for admin verification
function ComplianceRow({
  label,
  value,
  isSensitive,
  isVisible,
}: {
  label:        string;
  value?:       string | null;
  isSensitive?: boolean;   // adds unlocked icon (was locked — admin sees full)
  isVisible?:   boolean;   // adds eye icon (publicly visible field)
}): React.ReactElement {
  const isEmpty = !value || value === 'Not provided';

  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        {isSensitive && (
          <div
            className="w-6 h-6 rounded-md bg-red-50 border border-red-100 flex items-center justify-center"
            title="Encrypted in database — decrypted here for admin verification"
          >
            <Shield className="w-3 h-3 text-red-600" />
          </div>
        )}
        {isVisible && (
          <div
            className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center"
            title="Publicly visible business identifier"
          >
            <FileText className="w-3 h-3 text-blue-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-right min-w-0 flex-1">
        {isEmpty ? (
          <span className="text-sm text-gray-400 italic">Not provided</span>
        ) : (
          <span
            className={`text-sm font-mono font-bold ${
              isSensitive ? 'text-red-700' : 'text-gray-900'
            } break-all select-all`}
            title="Click to select — verify against uploaded document"
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

// V6.9.4: Reviews Section Component ──────────────────────────────
// World-class reviews management: search, filter, sort, paginate, expand

interface ReviewsSectionProps {
  agent:              Agent;
  agentId:            string;
  onEditReview:       (review: NonNullable<Agent['reviews']>[number]) => void;
  onDeleteReview:     (reviewId: string) => void;
  onToggleVisibility: (reviewId: string, currentPublished: boolean) => void;
  onAddReview:        () => void;
  deletingReviewId:   string | null;
  togglingReviewId:   string | null;
}

function ReviewsSection({
  agent,
  agentId,
  onEditReview,
  onDeleteReview,
  onToggleVisibility,
  onAddReview,
  deletingReviewId,
  togglingReviewId,
}: ReviewsSectionProps): React.ReactElement {
  const router = useRouter();
  const allReviews = agent.reviews ?? [];

  // ── State from URL params (bookmarkable filters) ──
  // Read filters from URL on mount + reactive updates
  const filters: ReviewFilters = {
    search:     typeof router.query.rSearch     === 'string' ? router.query.rSearch     : '',
    rating:     typeof router.query.rRating     === 'string' ? Number(router.query.rRating) : null,
    source:     typeof router.query.rSource     === 'string' ? router.query.rSource     : null,
    visibility: (typeof router.query.rVisibility === 'string' && ['all', 'public', 'hidden'].includes(router.query.rVisibility))
      ? router.query.rVisibility as 'all' | 'public' | 'hidden'
      : 'all',
    sort:       (typeof router.query.rSort === 'string' && ['newest', 'oldest', 'highest', 'lowest', 'edited'].includes(router.query.rSort))
      ? router.query.rSort as ReviewSortKey
      : 'newest',
    page:       typeof router.query.rPage === 'string' ? Math.max(1, parseInt(router.query.rPage, 10)) : 1,
  };

  // ── Expanded reviews (client-side state, per-session) ──
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Helper to update URL params
  const updateFilter = useCallback(
    (updates: Partial<ReviewFilters>) => {
      const newQuery = { ...router.query };

      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = `r${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (value === null || value === '' || (key === 'visibility' && value === 'all') || (key === 'sort' && value === 'newest') || (key === 'page' && value === 1)) {
          delete newQuery[paramKey];
        } else {
          newQuery[paramKey] = String(value);
        }
      });

      // Reset page when filters change (except when explicitly setting page)
      if (!('page' in updates)) {
        delete newQuery.rPage;
      }

      void router.replace({ pathname: router.pathname, query: newQuery }, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [router]
  );

  const clearAllFilters = useCallback(() => {
    updateFilter({
      search: '',
      rating: null,
      source: null,
      visibility: 'all',
      sort: 'newest',
      page: 1,
    });
  }, [updateFilter]);

  // ── Compute rating distribution (from ALL reviews, unfiltered) ──
  const distribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of allReviews) {
      const r = Math.max(1, Math.min(5, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
      dist[r]++;
    }
    return dist;
  }, [allReviews]);

  // ── Source counts ──
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const review of allReviews) {
      counts[review.source] = (counts[review.source] ?? 0) + 1;
    }
    return counts;
  }, [allReviews]);

  // ── Visibility counts ──
  const publishedCount = allReviews.filter((r) => r.isPublished).length;
  const hiddenCount    = allReviews.length - publishedCount;

  // ── Apply filters + sort ──
  const filteredReviews = useMemo(() => {
    let filtered = [...allReviews];

    // Search filter (text + reviewer name + city)
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.reviewText.toLowerCase().includes(query) ||
          r.reviewerName.toLowerCase().includes(query) ||
          (r.reviewerCity ?? '').toLowerCase().includes(query)
      );
    }

    // Rating filter
    if (filters.rating !== null) {
      filtered = filtered.filter((r) => r.rating === filters.rating);
    }

    // Source filter
    if (filters.source) {
      filtered = filtered.filter((r) => r.source === filters.source);
    }

    // Visibility filter
    if (filters.visibility === 'public') {
      filtered = filtered.filter((r) => r.isPublished);
    } else if (filters.visibility === 'hidden') {
      filtered = filtered.filter((r) => !r.isPublished);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'newest':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'oldest':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        case 'edited':
          // Recently edited first (fallback to added date if never edited)
          const aTime = a.editedAt ? new Date(a.editedAt).getTime() : new Date(a.addedAt).getTime();
          const bTime = b.editedAt ? new Date(b.editedAt).getTime() : new Date(b.addedAt).getTime();
          return bTime - aTime;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allReviews, filters]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const startIdx = (currentPage - 1) * REVIEWS_PER_PAGE;
  const paginatedReviews = filteredReviews.slice(startIdx, startIdx + REVIEWS_PER_PAGE);

  // Toggle expanded state
  const toggleExpand = useCallback((reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedReviews(new Set(paginatedReviews.map((r) => r._id ?? '').filter(Boolean)));
  }, [paginatedReviews]);

  const collapseAll = useCallback(() => {
    setExpandedReviews(new Set());
  }, []);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.rating !== null ||
    filters.source !== null ||
    filters.visibility !== 'all';

  const averageRating = agent.ratings?.averageRating ?? 0;
  const totalReviews  = allReviews.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#029bba]" />
          <h2 className="text-base font-bold text-[#004063]">
            Customer Reviews ({totalReviews})
          </h2>
        </div>
        <button
          onClick={onAddReview}
          disabled={agent.status !== 'approved'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-[#029bba] text-white text-xs font-bold
                     hover:bg-[#027a94] disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors"
          title={agent.status !== 'approved' ? 'Approve agent first' : 'Add new review'}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Review
        </button>
      </div>

      {/* ── Approval Required State ── */}
      {agent.status !== 'approved' ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Agent Must Be Approved First</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Approve the agent to start adding customer reviews.
            </p>
          </div>
        </div>
      ) : totalReviews === 0 ? (
        /* ── Empty State ── */
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 font-semibold">No reviews yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Click <strong>Add Review</strong> above to record client feedback from phone interviews or testimonials.
          </p>
        </div>
      ) : (
        <>
          {/* ═══ SUMMARY CARD ═══ */}
          <div className="mb-5 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {/* Big rating number */}
              <div className="text-center shrink-0">
                <div className="text-5xl font-black text-[#029bba] leading-none">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-0.5 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(averageRating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-2">
                  {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Distribution bars */}
              <div className="flex-1 w-full space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((stars) => {
                  const count = distribution[stars];
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5 shrink-0 w-14">
                        <span className="font-bold text-gray-600">{stars}</span>
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      </span>
                      <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-600 font-semibold shrink-0 w-16 text-right">
                        {count} ({Math.round(pct)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visibility summary */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Eye className="w-3.5 h-3.5" />
                {publishedCount} public
              </span>
              {hiddenCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-gray-500 font-semibold">
                  <EyeOff className="w-3.5 h-3.5" />
                  {hiddenCount} hidden
                </span>
              )}
            </div>
          </div>

          {/* ═══ SEARCH BAR ═══ */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
              placeholder="Search reviews or reviewer names..."
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200
                         focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                         text-sm outline-none transition-all"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter({ search: '' })}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* ═══ FILTER CHIPS ═══ */}
          <div className="space-y-3 mb-4">
            {/* Rating filter */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Rating
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => updateFilter({ rating: null })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    filters.rating === null
                      ? 'bg-[#029bba] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All <span className="opacity-70">({totalReviews})</span>
                </button>
                {([5, 4, 3, 2, 1] as const).map((stars) => (
                  <button
                    key={stars}
                    onClick={() => updateFilter({ rating: filters.rating === stars ? null : stars })}
                    disabled={distribution[stars] === 0}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filters.rating === stars
                        ? 'bg-[#029bba] text-white shadow-sm'
                        : distribution[stars] === 0
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${filters.rating === stars ? 'text-white fill-white' : 'text-yellow-500 fill-yellow-500'}`} />
                    {stars}
                    <span className="opacity-70">({distribution[stars]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Source filter */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Source
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => updateFilter({ source: null })}
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    filters.source === null
                      ? 'bg-[#029bba] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Sources
                </button>
                {Object.entries(REVIEW_SOURCE_LABELS).map(([key, label]) => {
                  const count = sourceCounts[key] ?? 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => updateFilter({ source: filters.source === key ? null : key })}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        filters.source === key
                          ? 'bg-[#029bba] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label} <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility filter */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Visibility
              </p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: 'all',    label: 'All',    count: totalReviews    },
                  { key: 'public', label: 'Public', count: publishedCount  },
                  { key: 'hidden', label: 'Hidden', count: hiddenCount     },
                ] as const).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => updateFilter({ visibility: key })}
                    disabled={key !== 'all' && count === 0}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filters.visibility === key
                        ? 'bg-[#029bba] text-white shadow-sm'
                        : key !== 'all' && count === 0
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label} <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ SORT + RESULTS COUNT + BULK ACTIONS ═══ */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Sort:
              </label>
              <select
                value={filters.sort}
                onChange={(e) => updateFilter({ sort: e.target.value as ReviewSortKey })}
                className="h-9 px-3 pr-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700
                           focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none cursor-pointer"
              >
                {REVIEW_SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Showing <strong className="text-gray-900">{paginatedReviews.length}</strong> of <strong className="text-gray-900">{filteredReviews.length}</strong>
                {filteredReviews.length !== totalReviews && ` (filtered from ${totalReviews})`}
              </span>

              {paginatedReviews.length > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={expandedReviews.size === paginatedReviews.length ? collapseAll : expandAll}
                    className="text-[#029bba] font-semibold hover:underline"
                  >
                    {expandedReviews.size === paginatedReviews.length ? 'Collapse All' : 'Expand All'}
                  </button>
                </>
              )}

              {hasActiveFilters && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={clearAllFilters}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ═══ REVIEW LIST ═══ */}
          {paginatedReviews.length === 0 ? (
            /* No results (with filters) */
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500">No reviews match your filters</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              <button
                onClick={clearAllFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#029bba] text-white
                           rounded-lg text-xs font-bold hover:bg-[#027a94] transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedReviews.map((review) => {
                const reviewId = review._id ?? '';
                const isExpanded = expandedReviews.has(reviewId);
                const sourceStyle = REVIEW_SOURCE_COLORS[review.source] ?? REVIEW_SOURCE_COLORS.admin_verified;
                const isDeleting = deletingReviewId === reviewId;
                const isToggling = togglingReviewId === reviewId;

                return (
                  <div
                    key={reviewId}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      review.isPublished
                        ? 'bg-white border-gray-200 hover:border-[#029bba]/30 hover:shadow-md'
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    {/* ── Card Header (always visible, clickable to expand) ── */}
                    <button
                      onClick={() => toggleExpand(reviewId)}
                      className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                    >
                      {/* Expand indicator */}
                      <div className="pt-1 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Stars + reviewer meta */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < review.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs font-bold text-gray-900">
                              {review.rating}/5
                            </span>
                          </div>

                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${sourceStyle.bg} ${sourceStyle.text} ${sourceStyle.border}`}>
                            {REVIEW_SOURCE_LABELS[review.source] ?? review.source}
                          </span>

                          {review.isPublished ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                              <Eye className="w-2.5 h-2.5" />
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-500">
                              <EyeOff className="w-2.5 h-2.5" />
                              Hidden
                            </span>
                          )}

                          {review.editedAt && (
                            <span
                              className="inline-flex items-center text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
                              title={`Last edited: ${new Date(review.editedAt).toLocaleString('en-PK')}`}
                            >
                              Edited
                            </span>
                          )}
                        </div>

                        {/* Review preview (collapsed) or full (expanded) */}
                        <p className={`text-sm text-gray-700 leading-relaxed ${!isExpanded ? 'line-clamp-1' : ''}`}>
                          &ldquo;{review.reviewText}&rdquo;
                        </p>

                        {/* Reviewer info */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-[11px] text-gray-500">
                          <span className="font-bold text-gray-700">— {review.reviewerName}</span>
                          {review.reviewerCity && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {review.reviewerCity}
                            </span>
                          )}
                          <span>·</span>
                          <span>
                            {new Date(review.addedAt).toLocaleDateString('en-PK', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* ── Expanded Content ── */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/40">
                        {/* Admin notes */}
                        {review.adminNotes && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" />
                              Internal Notes (Admin Only)
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{review.adminNotes}</p>
                          </div>
                        )}

                        {/* Transaction ref */}
                        {review.transactionRef && (
                          <div className="mt-3 flex items-center gap-2 text-[11px]">
                            <span className="text-gray-500 font-semibold">Transaction Ref:</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                              {review.transactionRef}
                            </span>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
                          <span>
                            <strong>Added:</strong> {new Date(review.addedAt).toLocaleString('en-PK')}
                          </span>
                          {review.editedAt && (
                            <span>
                              <strong>Edited:</strong> {new Date(review.editedAt).toLocaleString('en-PK')}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => onEditReview(review)}
                            disabled={isDeleting || isToggling}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                       bg-white border border-gray-200 text-gray-700
                                       hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700
                                       text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>

                          <button
                            onClick={() => reviewId && onToggleVisibility(reviewId, review.isPublished)}
                            disabled={isDeleting || isToggling || !reviewId}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                       border text-xs font-bold transition-colors disabled:opacity-50 ${
                              review.isPublished
                                ? 'bg-white border-gray-200 text-gray-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700'
                                : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : review.isPublished ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                Publish
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => reviewId && onDeleteReview(reviewId)}
                            disabled={isDeleting || isToggling || !reviewId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                       bg-white border border-gray-200 text-red-600
                                       hover:bg-red-50 hover:border-red-300
                                       text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ PAGINATION ═══ */}
          {totalPages > 1 && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Page <strong className="text-gray-900">{currentPage}</strong> of <strong className="text-gray-900">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateFilter({ page: currentPage - 1 })}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200
                             text-xs font-bold text-gray-700 hover:bg-gray-50
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>

                {/* Page number buttons */}
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, current, and nearby pages
                    const isCurrent = pageNum === currentPage;
                    const isNearCurrent = Math.abs(pageNum - currentPage) <= 1;
                    const isEdge = pageNum === 1 || pageNum === totalPages;

                    if (!isCurrent && !isNearCurrent && !isEdge) {
                      // Show ellipsis
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="text-gray-400 px-1">…</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => updateFilter({ page: pageNum })}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          isCurrent
                            ? 'bg-[#029bba] text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => updateFilter({ page: currentPage + 1 })}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200
                             text-xs font-bold text-gray-700 hover:bg-gray-50
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton(): React.ReactElement {
  return (
    <AdminLayout>
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="bg-white rounded-2xl p-6 h-36 border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-48 border border-gray-100" />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAgentDetail(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = router.query;

  // Auth guard (V6.8.0 — Session 3 pattern)
  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.replace('/login');
      return;
    }
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      void router.replace('/');
    }
  }, [status, session, router]);

  // State
  const [agent, setAgent]             = useState<Agent | null>(null);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal]   = useState(false);
  const [rejectReason, setRejectReason]         = useState('');

  // V6.8.0: New admin action modals
  const [showSuspendModal, setShowSuspendModal]     = useState(false);
  const [suspendReason, setSuspendReason]           = useState('');
  const [showReinstateModal, setShowReinstateModal] = useState(false);

  // V6.8.6: Trust score recalculation state
  const [recalculating, setRecalculating] = useState(false);

  // V6.8.7: Per-item verification state (tracks which item is being toggled)
  const [verifyingItem, setVerifyingItem] = useState<string | null>(null);
  const [showOfficeVerifyModal, setShowOfficeVerifyModal] = useState(false);
  const [officeVerifyNotes, setOfficeVerifyNotes] = useState('');

  // V6.8.8: Review management state
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [addingReview, setAddingReview]             = useState(false);
  const [deletingReviewId, setDeletingReviewId]     = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    rating:         5,
    reviewText:     '',
    reviewerName:   '',
    reviewerCity:   '',
    source:         'admin_verified' as
      | 'admin_verified'
      | 'client_testimonial'
      | 'post_transaction'
      | 'highrise_investigation',
    adminNotes:     '',
    isPublished:    true,
    transactionRef: '',
  });

  // V6.9.4: Edit review state (uses same form shape as add)
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [editingReviewId, setEditingReviewId]         = useState<string | null>(null);
  const [editingReview, setEditingReview]             = useState(false);
  const [togglingReviewId, setTogglingReviewId]       = useState<string | null>(null);
  const [editReviewForm, setEditReviewForm] = useState({
    rating:         5,
    reviewText:     '',
    reviewerName:   '',
    reviewerCity:   '',
    source:         'admin_verified' as
      | 'admin_verified'
      | 'client_testimonial'
      | 'post_transaction'
      | 'highrise_investigation',
    adminNotes:     '',
    isPublished:    true,
    transactionRef: '',
  });

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  // Load agent
  const loadAgent = useCallback(async (agentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, { credentials: 'include' });
      const data: { success: boolean; agent?: Agent; message?: string } = await res.json();
      if (!res.ok || !data.success || !data.agent) {
        showBanner('error', data.message ?? 'Failed to load agent details.');
        return;
      }
      setAgent(data.agent);
    } catch {
      showBanner('error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [showBanner]);

  useEffect(() => {
    if (status === 'authenticated' && session.user.role === 'admin' && typeof id === 'string') {
      void loadAgent(id);
    }
  }, [id, status, session, loadAgent]);

  // Approve
  const handleApprove = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to approve agent.');
        return;
      }
      setShowApproveModal(false);
      showBanner('success', `${agent.displayName} approved successfully.`);
      window.dispatchEvent(new Event('refreshAdminStats'));
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject
  const handleReject = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to reject agent.');
        return;
      }
      setShowRejectModal(false);
      setRejectReason('');
      showBanner('success', `${agent.displayName} has been rejected.`);
      window.dispatchEvent(new Event('refreshAdminStats'));
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // V6.8.0: Suspend (approved agent → suspended)
  const handleSuspend = async () => {
    if (!agent) return;
    if (suspendReason.trim().length < 10) {
      showBanner('error', 'Suspension reason must be at least 10 characters.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status:           'suspended',
          suspensionReason: suspendReason,
        }),
      });
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to suspend agent.');
        return;
      }
      setShowSuspendModal(false);
      setSuspendReason('');
      showBanner('success', `${agent.displayName} has been suspended.`);
      window.dispatchEvent(new Event('refreshAdminStats'));
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // V6.8.0: Reinstate (suspended → approved)
  const handleReinstate = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });
      const data: { success: boolean; message?: string } = await res.json();
      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to reinstate agent.');
        return;
      }
      setShowReinstateModal(false);
      showBanner('success', `${agent.displayName} has been reinstated.`);
      window.dispatchEvent(new Event('refreshAdminStats'));
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // V6.8.6: Recalculate trust score
  const handleRecalculateTrust = async () => {
    if (!agent) return;
    setRecalculating(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent._id}/recalculate-trust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data: {
        success: boolean;
        message?: string;
        data?: { trustScore?: { overall: number } };
      } = await res.json();

      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to recalculate trust score.');
        return;
      }

      const newScore = data.data?.trustScore?.overall ?? 0;
      showBanner('success', `Trust score updated: ${newScore}/100`);
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setRecalculating(false);
    }
  };

  // V6.8.8: Add new admin-curated review
  const handleAddReview = async () => {
    if (!agent) {
      showBanner('error', 'Agent data not loaded. Please refresh.');
      return;
    }

    // Client-side validation
    if (reviewForm.reviewText.trim().length < 10) {
      showBanner('error', 'Review text must be at least 10 characters.');
      return;
    }
    if (reviewForm.reviewerName.trim().length < 2) {
      showBanner('error', 'Reviewer name is required.');
      return;
    }

    setAddingReview(true);
    try {
      const payload = {
        rating:         reviewForm.rating,
        reviewText:     reviewForm.reviewText.trim(),
        reviewerName:   reviewForm.reviewerName.trim(),
        reviewerCity:   reviewForm.reviewerCity.trim() || undefined,
        source:         reviewForm.source,
        adminNotes:     reviewForm.adminNotes.trim() || undefined,
        isPublished:    reviewForm.isPublished,
        transactionRef: reviewForm.transactionRef.trim() || undefined,
      };

      const res = await fetch(`/api/admin/agents/${agent._id}/reviews`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(payload),
      });

      const data: {
        success: boolean;
        message?: string;
        data?: { trustScore?: number };
      } = await res.json();

      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? `Failed to add review (HTTP ${res.status})`);
        return;
      }

      const newScore = data.data?.trustScore ?? 0;
      showBanner('success', `Review added. Trust score: ${newScore}/100`);

      // Reset form + close modal
      setReviewForm({
        rating:         5,
        reviewText:     '',
        reviewerName:   '',
        reviewerCity:   '',
        source:         'admin_verified',
        adminNotes:     '',
        isPublished:    true,
        transactionRef: '',
      });
      setShowAddReviewModal(false);
      void loadAgent(agent._id);
    } catch (err) {
      showBanner('error', `Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setAddingReview(false);
    }
  };

  // V6.8.8: Delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (!agent) return;

    // V6.9.4: Simple confirmation for delete (destructive action)
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this review?\n\nThis action cannot be undone. Consider using "Hide" instead if you want to remove it temporarily.'
      );
      if (!confirmed) return;
    }

    setDeletingReviewId(reviewId);
    try {
      const res = await fetch(
        `/api/admin/agents/${agent._id}/reviews/${reviewId}`,
        {
          method:      'DELETE',
          credentials: 'include',
        }
      );
      const data: {
        success: boolean;
        message?: string;
        data?: { trustScore?: number };
      } = await res.json();

      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to delete review.');
        return;
      }

      const newScore = data.data?.trustScore ?? 0;
      showBanner('success', `Review deleted. Trust score: ${newScore}/100`);
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  // V6.9.4: Toggle review visibility (publish/hide)
  const handleToggleReviewVisibility = async (reviewId: string, currentPublished: boolean) => {
    if (!agent) return;
    setTogglingReviewId(reviewId);
    try {
      const res = await fetch(
        `/api/admin/agents/${agent._id}/reviews/${reviewId}`,
        {
          method:      'PATCH',
          headers:     { 'Content-Type': 'application/json' },
          credentials: 'include',
          body:        JSON.stringify({ isPublished: !currentPublished }),
        }
      );
      const data: {
        success: boolean;
        message?: string;
        data?: { trustScore?: number };
      } = await res.json();

      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to update review visibility.');
        return;
      }

      showBanner('success', data.message ?? 'Review visibility updated.');
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setTogglingReviewId(null);
    }
  };

  // V6.9.4: Open edit modal with pre-filled data
  const handleOpenEditReview = (review: NonNullable<Agent['reviews']>[number]) => {
    if (!review._id) return;
    setEditingReviewId(review._id);
    setEditReviewForm({
      rating:         review.rating,
      reviewText:     review.reviewText,
      reviewerName:   review.reviewerName,
      reviewerCity:   review.reviewerCity ?? '',
      source:         review.source,
      adminNotes:     review.adminNotes ?? '',
      isPublished:    review.isPublished,
      transactionRef: review.transactionRef ?? '',
    });
    setShowEditReviewModal(true);
  };

  // V6.9.4: Save edited review
  const handleSaveEditReview = async () => {
    if (!agent || !editingReviewId) return;

    if (editReviewForm.reviewText.trim().length < 10) {
      showBanner('error', 'Review text must be at least 10 characters.');
      return;
    }
    if (editReviewForm.reviewerName.trim().length < 2) {
      showBanner('error', 'Reviewer name is required.');
      return;
    }

    setEditingReview(true);
    try {
      const payload = {
        rating:         editReviewForm.rating,
        reviewText:     editReviewForm.reviewText.trim(),
        reviewerName:   editReviewForm.reviewerName.trim(),
        reviewerCity:   editReviewForm.reviewerCity.trim(),
        source:         editReviewForm.source,
        adminNotes:     editReviewForm.adminNotes.trim(),
        isPublished:    editReviewForm.isPublished,
        transactionRef: editReviewForm.transactionRef.trim(),
      };

      const res = await fetch(
        `/api/admin/agents/${agent._id}/reviews/${editingReviewId}`,
        {
          method:      'PATCH',
          headers:     { 'Content-Type': 'application/json' },
          credentials: 'include',
          body:        JSON.stringify(payload),
        }
      );
      const data: {
        success: boolean;
        message?: string;
        data?: { trustScore?: number };
      } = await res.json();

      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? 'Failed to update review.');
        return;
      }

      showBanner('success', data.message ?? 'Review updated successfully.');
      setShowEditReviewModal(false);
      setEditingReviewId(null);
      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setEditingReview(false);
    }
  };

  // V6.8.7: Toggle individual verification item (CNIC/License/NTN/SECP/Office)
  const handleVerifyItem = async (
    item: 'cnic' | 'license' | 'ntn' | 'secp' | 'office',
    verified: boolean,
    notes?: string
  ) => {
    if (!agent) return;
    setVerifyingItem(item);
    try {
      const res = await fetch(`/api/admin/agents/${agent._id}/verify-item`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ item, verified, notes }),
      });
      const data: {
        success: boolean;
        message?: string;
        data?: { trustScore?: number };
      } = await res.json();

      if (!res.ok || !data.success) {
        showBanner('error', data.message ?? `Failed to update ${item}.`);
        return;
      }

      const newScore = data.data?.trustScore ?? 0;
      showBanner(
        'success',
        `${item.toUpperCase()} ${verified ? '✓ verified' : '✗ unverified'} — Trust score: ${newScore}/100`
      );

      // Close office modal if it was open
      if (item === 'office') {
        setShowOfficeVerifyModal(false);
        setOfficeVerifyNotes('');
      }

      void loadAgent(agent._id);
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setVerifyingItem(null);
    }
  };

  // Loading / auth states
  if (status === 'loading' || status === 'unauthenticated') return <PageSkeleton />;
  if (loading) return <PageSkeleton />;

  if (!agent) {
    return (
      <>
        <Head>
          <title>Agent Not Found — Admin | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <AdminLayout>
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Agent Not Found</h2>
            <p className="text-gray-500 text-sm">This agent profile may have been deleted.</p>
            <Link
              href="/admin/agents"
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
            >
              Back to Agents
            </Link>
          </div>
        </AdminLayout>
      </>
    );
  }

  const avatarUrl = agent.documents?.profilePhoto?.url ?? agent.agencyLogo?.url;

  return (
    <>
      <Head>
        <title>{agent.displayName} — Agent Review | Admin | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#10b981] to-green-600 px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Approve Agent</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center mb-4">
                Approve <span className="font-bold text-gray-900">{agent.displayName}</span>?
              </p>
              <div className="bg-[#f0fdf4] border border-green-100 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-green-800 mb-2">This agent will be able to:</p>
                <ul className="space-y-1.5">
                  {[
                    'List properties on Highrise.pk',
                    'Appear in verified agents directory',
                    'Receive buyer and seller leads',
                    'Get verified badge on profile',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-gray-400 mb-5">
                An email notification will be sent to the agent upon approval.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleApprove()}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-green-600 text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {actionLoading ? 'Approving...' : 'Yes, Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* V6.8.0: Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Suspend Agent</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Suspending <span className="font-semibold">{agent.displayName}</span>
                </p>
              </div>
              <button onClick={() => setShowSuspendModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-orange-800">
                <strong>Warning:</strong> The agent will lose access to the platform immediately.
                All their listings will be hidden from public view.
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(min. 10 characters)</span>
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                placeholder="Explain why this agent is being suspended..."
                className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {suspendReason.trim().length} / 10 minimum characters
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSuspend()}
                disabled={actionLoading || suspendReason.trim().length < 10}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
              >
                {actionLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : null}
                {actionLoading ? 'Suspending...' : 'Suspend Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V6.8.0: Reinstate Modal */}
      {showReinstateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#029bba] to-[#027a94] px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Reinstate Agent</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center mb-4">
                Reinstate <span className="font-bold text-gray-900">{agent.displayName}</span>?
              </p>
              <div className="bg-[#f0fdf4] border border-green-100 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-green-800 mb-2">This agent will regain access to:</p>
                <ul className="space-y-1.5">
                  {[
                    'Agent portal and dashboard',
                    'Property listings management',
                    'Buyer leads and inquiries',
                    'Verified agent badge on profile',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-gray-400 mb-5">
                The agent&apos;s listings will become publicly visible again.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReinstateModal(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleReinstate()}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {actionLoading ? 'Reinstating...' : 'Yes, Reinstate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* V6.8.7: Office Verification Modal */}
      {showOfficeVerifyModal && agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Verify Office Visit</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Confirm you physically visited this office
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOfficeVerifyModal(false);
                  setOfficeVerifyNotes('');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
              <p className="text-xs font-bold text-emerald-800 mb-1">Office Address:</p>
              <p className="text-sm text-emerald-900">{agent.officeVerification?.address}</p>
              <p className="text-xs text-emerald-700 mt-1">{agent.officeVerification?.city}</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Visit Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={officeVerifyNotes}
                onChange={(e) => setOfficeVerifyNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Visited on 15 Jul 2026, office was active, staff present, signage matches..."
                className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                These notes are for internal records only (not visible to agent)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOfficeVerifyModal(false);
                  setOfficeVerifyNotes('');
                }}
                disabled={verifyingItem === 'office'}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleVerifyItem('office', true, officeVerifyNotes.trim() || undefined)}
                disabled={verifyingItem === 'office'}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {verifyingItem === 'office'
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                {verifyingItem === 'office' ? 'Verifying...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V6.8.8: Add Review Modal */}
      {showAddReviewModal && agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#029bba] to-[#0284a3] px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add Customer Review</h3>
                  <p className="text-xs text-white/80 mt-0.5">For {agent.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddReviewModal(false)}
                disabled={addingReview}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm((p) => ({ ...p, rating: star }))}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewForm.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-gray-700">
                    {reviewForm.rating}/5
                  </span>
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Review Source <span className="text-red-500">*</span>
                </label>
                <select
                  value={reviewForm.source}
                  onChange={(e) => setReviewForm((p) => ({
                    ...p,
                    source: e.target.value as typeof reviewForm.source,
                  }))}
                  className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
                >
                  <option value="admin_verified">Admin Verified (phone interview)</option>
                  <option value="client_testimonial">Client Testimonial</option>
                  <option value="post_transaction">Post-Transaction Survey</option>
                  <option value="highrise_investigation">Highrise Investigation</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  How did Highrise.pk obtain this review?
                </p>
              </div>

              {/* Reviewer Name + City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Reviewer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewForm.reviewerName}
                    onChange={(e) => setReviewForm((p) => ({ ...p, reviewerName: e.target.value }))}
                    placeholder="e.g. Ahmed Khan"
                    maxLength={80}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={reviewForm.reviewerCity}
                    onChange={(e) => setReviewForm((p) => ({ ...p, reviewerCity: e.target.value }))}
                    placeholder="e.g. Islamabad"
                    maxLength={60}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
                  />
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Review <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(10-1000 chars)</span>
                </label>
                <textarea
                  value={reviewForm.reviewText}
                  onChange={(e) => setReviewForm((p) => ({ ...p, reviewText: e.target.value }))}
                  rows={4}
                  placeholder="e.g. Very professional agent, helped us find our dream home in F-7. Quick response, transparent dealings..."
                  maxLength={1000}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {reviewForm.reviewText.length}/1000 characters
                </p>
              </div>

              {/* Transaction Ref (optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Transaction Reference <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={reviewForm.transactionRef}
                  onChange={(e) => setReviewForm((p) => ({ ...p, transactionRef: e.target.value }))}
                  placeholder="e.g. Property listing ID or deal reference"
                  maxLength={100}
                  className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
                />
              </div>

              {/* Admin Notes (internal) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Internal Notes <span className="text-gray-400 font-normal">(admin only, not public)</span>
                </label>
                <textarea
                  value={reviewForm.adminNotes}
                  onChange={(e) => setReviewForm((p) => ({ ...p, adminNotes: e.target.value }))}
                  rows={2}
                  placeholder="Notes about verification process, phone call details, etc."
                  maxLength={500}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 resize-none"
                />
              </div>

              {/* Publish toggle */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewForm.isPublished}
                  onChange={(e) => setReviewForm((p) => ({ ...p, isPublished: e.target.checked }))}
                  className="w-4 h-4 accent-[#029bba]"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Publish immediately</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Show on public profile. Uncheck to save as draft.
                  </p>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowAddReviewModal(false)}
                disabled={addingReview}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddReview()}
                disabled={
                  addingReview ||
                  reviewForm.reviewText.trim().length < 10 ||
                  reviewForm.reviewerName.trim().length < 2
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
              >
                {addingReview ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V6.9.4: Edit Review Modal */}
      {showEditReviewModal && agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Customer Review</h3>
                  <p className="text-xs text-white/80 mt-0.5">For {agent.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditReviewModal(false)}
                disabled={editingReview}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditReviewForm((p) => ({ ...p, rating: star }))}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= editReviewForm.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-gray-700">
                    {editReviewForm.rating}/5
                  </span>
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Review Source <span className="text-red-500">*</span>
                </label>
                <select
                  value={editReviewForm.source}
                  onChange={(e) => setEditReviewForm((p) => ({
                    ...p,
                    source: e.target.value as typeof editReviewForm.source,
                  }))}
                  className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="admin_verified">Admin Verified (phone interview)</option>
                  <option value="client_testimonial">Client Testimonial</option>
                  <option value="post_transaction">Post-Transaction Survey</option>
                  <option value="highrise_investigation">Highrise Investigation</option>
                </select>
              </div>

              {/* Reviewer Name + City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Reviewer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editReviewForm.reviewerName}
                    onChange={(e) => setEditReviewForm((p) => ({ ...p, reviewerName: e.target.value }))}
                    maxLength={80}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={editReviewForm.reviewerCity}
                    onChange={(e) => setEditReviewForm((p) => ({ ...p, reviewerCity: e.target.value }))}
                    maxLength={60}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Review <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(10-1000 chars)</span>
                </label>
                <textarea
                  value={editReviewForm.reviewText}
                  onChange={(e) => setEditReviewForm((p) => ({ ...p, reviewText: e.target.value }))}
                  rows={4}
                  maxLength={1000}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {editReviewForm.reviewText.length}/1000 characters
                </p>
              </div>

              {/* Transaction Ref */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Transaction Reference <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editReviewForm.transactionRef}
                  onChange={(e) => setEditReviewForm((p) => ({ ...p, transactionRef: e.target.value }))}
                  maxLength={100}
                  className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Internal Notes <span className="text-gray-400 font-normal">(admin only)</span>
                </label>
                <textarea
                  value={editReviewForm.adminNotes}
                  onChange={(e) => setEditReviewForm((p) => ({ ...p, adminNotes: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Publish toggle */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={editReviewForm.isPublished}
                  onChange={(e) => setEditReviewForm((p) => ({ ...p, isPublished: e.target.checked }))}
                  className="w-4 h-4 accent-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Published (visible on public profile)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Uncheck to hide from public without deleting.
                  </p>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowEditReviewModal(false)}
                disabled={editingReview}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveEditReview()}
                disabled={
                  editingReview ||
                  editReviewForm.reviewText.trim().length < 10 ||
                  editReviewForm.reviewerName.trim().length < 2
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
              >
                {editingReview ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Reject Agent</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Rejecting <span className="font-semibold">{agent.displayName}</span>
                </p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Reason <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why this agent is being rejected..."
                className="w-full rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 text-sm p-3 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {actionLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : null
                }
                {actionLoading ? 'Rejecting...' : 'Reject Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminLayout>
        <div className="space-y-6 max-w-5xl mx-auto">

          {/* Banner */}
          {banner && (
            <div className={`rounded-xl p-4 border-l-4 flex items-center justify-between gap-4 ${
              banner.type === 'success'
                ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]'
                : 'bg-[#fef2f2] border-[#ef4444] text-red-700'
            }`}>
              <p className="text-sm font-medium">{banner.message}</p>
              <button onClick={() => setBanner(null)} className="shrink-0 p-1 rounded hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin" className="hover:text-gray-700 transition-colors">Admin</Link>
            <span>/</span>
            <Link href="/admin/agents" className="hover:text-gray-700 transition-colors">Agents</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{agent.displayName}</span>
          </div>

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4">
                {avatarUrl ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border border-gray-100 shrink-0">
                    <Image src={avatarUrl} alt={agent.displayName} fill sizes="80px" className="object-cover" priority />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#029bba] flex items-center justify-center text-3xl font-bold text-white shrink-0">
                    {agent.displayName?.charAt(0)?.toUpperCase() ?? 'A'}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-[#004063]">{agent.displayName}</h1>
                  {agent.tagline && (
                    <p className="text-gray-500 text-sm mt-0.5">{agent.tagline}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={agent.status} />
                    {agent.isPremium && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                        <Star className="w-3 h-3" />
                        {agent.premiumTier ?? 'Premium'}
                      </span>
                    )}
                    {agent.slug && agent.status === 'approved' && (
                      <Link
                        href={`/agent/${agent.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#029bba] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Public Profile
                      </Link>
                    )}
                    {agent.slug && agent.status !== 'approved' && (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-gray-400 italic"
                        title="Public profile becomes available after approval"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Public profile pending approval
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 shrink-0">
                {/* Approve — available for pending, rejected, suspended */}
                {(agent.status === 'pending' ||
                  agent.status === 'rejected' ||
                  agent.status === 'suspended' ||
                  agent.status === 'draft') && (
                  <button
                    onClick={() => setShowApproveModal(true)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Approve
                  </button>
                )}

                {/* Reject — only for pending, draft */}
                {(agent.status === 'pending' || agent.status === 'draft') && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                )}

                {/* V6.8.0: Suspend — only for approved */}
                {agent.status === 'approved' && (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Suspend
                  </button>
                )}

                {/* V6.8.0: Reinstate — only for suspended */}
                {agent.status === 'suspended' && (
                  <button
                    onClick={() => setShowReinstateModal(true)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    Reinstate
                  </button>
                )}

                <Link
                  href="/admin/agents"
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </div>
            </div>
          </div>

          {/* V6.8.7: Interactive Verification Toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#029bba]" />
                <h2 className="text-base font-bold text-[#004063]">Individual Verifications</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                Trust Score Auto-Updates
              </span>
            </div>

            {agent.status !== 'approved' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Agent Must Be Approved First</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Approve the agent above to enable individual document verifications.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <VerificationToggle
                    verified={agent.cnicVerified}
                    label="CNIC"
                    item="cnic"
                    loading={verifyingItem === 'cnic'}
                    onToggle={(item, verified) => void handleVerifyItem(item, verified)}
                  />
                  <VerificationToggle
                    verified={agent.licenseVerified}
                    label="License"
                    item="license"
                    loading={verifyingItem === 'license'}
                    onToggle={(item, verified) => void handleVerifyItem(item, verified)}
                  />
                  <VerificationToggle
                    verified={agent.ntnVerified}
                    label="NTN"
                    item="ntn"
                    loading={verifyingItem === 'ntn'}
                    onToggle={(item, verified) => void handleVerifyItem(item, verified)}
                  />
                  <VerificationToggle
                    verified={agent.secpVerified}
                    label="SECP"
                    item="secp"
                    loading={verifyingItem === 'secp'}
                    onToggle={(item, verified) => void handleVerifyItem(item, verified)}
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Guide:</strong> Verify each document manually after reviewing.
                      Compare the identifier (above in Business Compliance) against the uploaded image.
                      Trust Score auto-recalculates after each toggle.
                    </span>
                  </p>
                </div>

                {/* Office Verification Card */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#029bba]" />
                    Office Physical Verification
                  </h3>

                  {agent.officeVerification?.address ? (
                    <div className={`p-4 rounded-xl border-2 transition-all ${
                      agent.officeVerification.verifiedAt
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      {/* V6.9.0: Map preview for admin verification */}
                      {/* CRITICAL: Pass coordinates so map shows EXACT GPS pin */}
                      {/* Without lat/lng, component geocodes text address (approximation) */}
                      <div className="mb-4">
                        <OfficeMapPreview
                          address={agent.officeVerification.address}
                          city={agent.officeVerification.city}
                          lat={agent.officeVerification.coordinates?.latitude}
                          lng={agent.officeVerification.coordinates?.longitude}
                          height={220}
                          zoom={16}
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                            Office Address
                          </p>
                          <p className="text-sm text-gray-900">{agent.officeVerification.address}</p>
                          <p className="text-xs text-gray-500 mt-1">{agent.officeVerification.city}</p>

                          {agent.officeVerification.verifiedAt && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="font-semibold">
                                Physically verified on {new Date(agent.officeVerification.verifiedAt).toLocaleDateString('en-PK', {
                                  day: 'numeric', month: 'long', year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (agent.officeVerification?.verifiedAt) {
                              void handleVerifyItem('office', false);
                            } else {
                              setShowOfficeVerifyModal(true);
                            }
                          }}
                          disabled={verifyingItem === 'office'}
                          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50 ${
                            agent.officeVerification.verifiedAt
                              ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}
                        >
                          {verifyingItem === 'office' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Updating...
                            </span>
                          ) : agent.officeVerification.verifiedAt ? (
                            'Remove Verification'
                          ) : (
                            '✓ Mark Verified'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">
                      Agent has not provided an office address yet.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Trust Score — V6.8.6: Auto-calculated + Manual Recalc */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#029bba]" />
                <h2 className="text-base font-bold text-[#004063]">Trust Score</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-[#029bba]">
                  {agent.trustScore.overall}
                  <span className="text-sm text-gray-400 font-normal">/100</span>
                </span>
                <button
                  onClick={() => void handleRecalculateTrust()}
                  disabled={recalculating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-[#029bba]/10 text-[#029bba] text-xs font-bold
                             hover:bg-[#029bba]/20 disabled:opacity-50
                             disabled:cursor-not-allowed transition-colors"
                  title="Recalculate trust score based on current data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating ? 'Calculating...' : 'Recalculate'}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-[#029bba] to-[#0284a3] rounded-full transition-all duration-500"
                style={{ width: `${agent.trustScore.overall}%` }}
              />
            </div>

            {/* Last calculated */}
            {agent.trustScore.lastCalculated && (
              <p className="text-[10px] text-gray-400 mb-4">
                Last calculated: {new Date(agent.trustScore.lastCalculated).toLocaleString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}

            {/* Breakdown with progress bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'profileComplete',    label: 'Profile Complete',    max: 20, icon: '👤' },
                { key: 'documentsVerified',  label: 'Documents Verified',  max: 25, icon: '📄' },
                { key: 'officeVerified',     label: 'Office Verified',     max: 15, icon: '🏢' },
                { key: 'customerRatings',    label: 'Customer Ratings',    max: 20, icon: '⭐' },
                { key: 'dealHistory',        label: 'Deal History',        max: 15, icon: '🤝' },
                { key: 'responseTime',       label: 'Response Time',       max: 5,  icon: '⚡' },
              ].map(({ key, label, max, icon }) => {
                const val = agent.trustScore.breakdown[key] ?? 0;
                const pct = max > 0 ? (val / max) * 100 : 0;
                const color =
                  pct >= 80 ? 'bg-emerald-500' :
                  pct >= 50 ? 'bg-blue-500' :
                  pct >= 25 ? 'bg-amber-500' :
                              'bg-gray-300';
                return (
                  <div key={key} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{icon}</span>
                        <p className="text-[11px] text-gray-600 font-medium">{label}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-900">
                        {val}<span className="text-gray-400">/{max}</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-[#029bba] shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Trust Score is auto-calculated based on profile completeness, verified documents,
                office verification, customer ratings, deal history, and response time.
                Click <strong>Recalculate</strong> after admin actions to refresh.
              </p>
            </div>
          </div>

          {/* V6.9.4: Enterprise Reviews Management — Search, Filter, Sort, Paginate, Edit */}
          <ReviewsSection
            agent={agent}
            agentId={agent._id}
            onAddReview={() => setShowAddReviewModal(true)}
            onEditReview={handleOpenEditReview}
            onDeleteReview={handleDeleteReview}
            onToggleVisibility={handleToggleReviewVisibility}
            deletingReviewId={deletingReviewId}
            togglingReviewId={togglingReviewId}
          />

          {/* Badges */}
          {agent.badges.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#029bba]" />
                <h2 className="text-base font-bold text-[#004063]">Earned Badges</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#029bba]/10 text-[#029bba] capitalize"
                  >
                    {badge.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* V6.8.4: Business Compliance & Identity Section — FULL VALUES for admin verification */}
          <div className="bg-white rounded-2xl border-2 border-red-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h2 className="text-base font-bold text-[#004063]">Business Compliance &amp; Identity</h2>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  <strong className="text-red-700">Full values shown for verification.</strong> Compare against uploaded documents below.
                  Every view is logged. Data is encrypted (AES-256-GCM) at rest.
                </p>
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200 shrink-0"
                title="Admin can see full values — every access is audit-logged"
              >
                🔓 Decrypted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {/* Left column — Identity */}
              <dl>
                <ComplianceRow
                  label="CNIC Number"
                  value={formatCnicDisplay(agent.cnicNumber)}
                  isSensitive
                />
                <ComplianceRow
                  label="License Number"
                  value={agent.licenseNumber}
                  isSensitive
                />
                <ComplianceRow
                  label="NTN Number"
                  value={agent.ntnNumber}
                  isSensitive
                />
              </dl>

              {/* Right column — Business & Contact */}
              <dl>
                <ComplianceRow
                  label="Company Reg No"
                  value={agent.companyRegNo}
                  isVisible
                />
                <ComplianceRow
                  label="Phone"
                  value={formatPhoneDisplay(agent.phoneNumber)}
                  isSensitive
                />
                <ComplianceRow
                  label="WhatsApp"
                  value={formatPhoneDisplay(agent.whatsappNumber)}
                  isSensitive
                />
              </dl>
            </div>

            {/* Verification status footer */}
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Verification Status:</span>
              <span className={`px-2 py-1 rounded-full font-semibold ${agent.cnicVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                CNIC {agent.cnicVerified ? '✓' : '✗'}
              </span>
              <span className={`px-2 py-1 rounded-full font-semibold ${agent.licenseVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                License {agent.licenseVerified ? '✓' : '✗'}
              </span>
              <span className={`px-2 py-1 rounded-full font-semibold ${agent.ntnVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                NTN {agent.ntnVerified ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Info sections grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Section title="Agent Information">
              <dl>
                <InfoRow label="Display Name"       value={agent.displayName}  />
                <InfoRow label="Agent Type"         value={agent.agentType}    />
                <InfoRow label="Agency Name"        value={agent.agencyName}   />
                <InfoRow label="Agency Size"        value={agent.agencySize}   />
                <InfoRow label="Representative"     value={agent.representativeName} />
                <InfoRow label="Representative Role" value={agent.representativeRole} />
                <InfoRow label="License Issuer"     value={agent.licenseIssuer} />
                <InfoRow label="Specializations"    value={agent.specializations.join(', ')} />
                <InfoRow label="Languages"          value={agent.languages.join(', ')} />
                <InfoRow label="Experience"         value={`${agent.experience.years} years`} />
                <InfoRow label="Total Deals"        value={agent.experience.totalDeals} />
              </dl>
            </Section>

            <Section title="Contact & Location">
              <dl>
                <InfoRow label="Personal Email"   value={agent.email}                             />
                <InfoRow label="Business Email"   value={agent.contactEmail}                      />
                <InfoRow label="Primary City"     value={agent.city}                              />
                <InfoRow label="Operating Cities" value={agent.operatingCities.join(', ')}        />
                <InfoRow label="Service Areas"    value={agent.serviceAreas?.localities?.join(', ')} />
                <InfoRow label="Is Available"     value={agent.isAvailable}                       />
                <InfoRow label="Is Featured"      value={agent.isFeatured}                        />
                <InfoRow label="Member Since"     value={new Date(agent.memberSince).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} />
              </dl>
              {agent.officeVerification && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#029bba]" />
                    Office
                  </p>
                  <p className="text-sm text-gray-600">{agent.officeVerification.address}</p>
                  <p className="text-xs text-gray-400 mt-1">{agent.officeVerification.city}</p>
                  {agent.officeVerification.verifiedAt && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#10b981] bg-[#f0fdf4] px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Office Verified
                    </span>
                  )}
                </div>
              )}
            </Section>

            <Section title="Performance Stats">
              <dl>
                <InfoRow label="Active Listings"     value={agent.stats.activeListings}    />
                <InfoRow label="Total Listings"      value={agent.stats.totalListings}     />
                <InfoRow label="Sold Properties"     value={agent.stats.soldProperties}    />
                <InfoRow label="Rented Properties"   value={agent.stats.rentedProperties}  />
                <InfoRow label="Total Leads"         value={agent.stats.totalLeads}        />
                <InfoRow label="Converted Leads"     value={agent.stats.convertedLeads}    />
                <InfoRow label="Response Rate"       value={agent.stats.responseRate !== undefined ? `${agent.stats.responseRate}%` : undefined} />
                <InfoRow label="Avg Response Time"   value={agent.stats.averageResponseTime !== undefined ? `${agent.stats.averageResponseTime} min` : undefined} />
              </dl>
            </Section>

            <Section title="Ratings">
              <dl>
                <InfoRow label="Average Rating" value={`${agent.ratings.averageRating} / 5`} />
                <InfoRow label="Total Reviews"  value={agent.ratings.totalReviews}           />
              </dl>
            </Section>

            <Section title="User Account">
              <dl>
                <InfoRow label="Name"           value={agent.user?.name}   />
                <InfoRow label="Email"          value={agent.user?.email}  />
                <InfoRow label="Role"           value={agent.user?.role}   />
                <InfoRow label="Status"         value={agent.user?.status} />
                <InfoRow label="Account Created" value={agent.user?.createdAt
                  ? new Date(agent.user.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
                  : undefined
                } />
              </dl>
            </Section>

            <Section title="Social Links">
              <dl>
                <InfoRow label="Facebook"  value={agent.socialLinks?.facebook}  />
                <InfoRow label="Instagram" value={agent.socialLinks?.instagram} />
                <InfoRow label="LinkedIn"  value={agent.socialLinks?.linkedin}  />
                <InfoRow label="YouTube"   value={agent.socialLinks?.youtube}   />
                <InfoRow label="Twitter"   value={agent.socialLinks?.twitter}   />
                <InfoRow label="TikTok"    value={agent.socialLinks?.tiktok}    />
                <InfoRow label="Website"   value={agent.socialLinks?.website}   />
              </dl>
            </Section>

            <Section title="Submission Info">
              <dl>
                <InfoRow label="Submitted On"  value={new Date(agent.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <InfoRow label="Last Updated"  value={new Date(agent.updatedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} />
                {agent.verifiedAt && (
                  <InfoRow label="Verified On" value={new Date(agent.verifiedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} />
                )}
                {agent.rejectionReason && (
                  <InfoRow label="Rejection Reason" value={agent.rejectionReason} />
                )}
                {agent.suspensionReason && (
                  <InfoRow label="Suspension Reason" value={agent.suspensionReason} />
                )}
              </dl>
            </Section>

            <Section title="About">
              <dl>
                <InfoRow label="Profile Slug" value={agent.slug} />
              </dl>
              {agent.about ? (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-500 mb-2">About</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{agent.about}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic mt-2">No bio provided.</p>
              )}
            </Section>

          </div>

          {/* V6.8.3: Documents Section — cleaned up (removed empty NTN/SECP boxes) */}
          <Section title="Uploaded Documents">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Review Guide:</strong> Verify each document matches the identity claims above.
                Check CNIC images are clear, match the agent&apos;s name, and are not expired.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Identity documents (MANDATORY for verification) */}
              <DocumentCard
                title="CNIC Front"
                url={agent.documents?.cnicFront?.url}
              />
              <DocumentCard
                title="CNIC Back"
                url={agent.documents?.cnicBack?.url}
              />
              <DocumentCard
                title="License / Verification Doc"
                url={agent.documents?.license?.url ?? agent.licenseDocumentUrl}
              />

              {/* Profile & branding (OPTIONAL — for public profile) */}
              <DocumentCard
                title="Profile Photo"
                url={agent.documents?.profilePhoto?.url}
              />
              <DocumentCard
                title="Cover Photo"
                url={agent.documents?.coverPhoto?.url}
              />
              <DocumentCard
                title="Agency Logo"
                url={agent.agencyLogo?.url}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Documents marked as &quot;Not uploaded&quot; are optional and can be added by the agent later from their dashboard.
              </p>
            </div>
          </Section>

          {/* Contact quick links */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-[#004063] mb-4">Quick Contact</h2>
            <div className="flex flex-wrap gap-3">
              {agent.email && (
                <a
                  href={`mailto:${agent.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba]/10 text-[#029bba] text-sm font-semibold hover:bg-[#029bba]/20 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Agent
                </a>
              )}
              {agent.slug && (
                <Link
                  href={`/agent/${agent.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Public Profile
                </Link>
              )}
            </div>
          </div>

        </div>
      </AdminLayout>
    </>
  );
}