// ========== FILE: pages/dashboard.tsx ==========
// 🔒 ENTERPRISE USER DASHBOARD - HIGHRISE.PK
// V5.8.0 — Banned libs removed | useAuth() hook | KYC gate
//          Onboarding status awareness | 3-tier upgrade CTA
//          Native Tailwind only | No framer-motion | No ui/Button
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Home,
  Heart,
  Clock,
  MessageSquare,
  Bell,
  Settings,
  Building,
  User,
  ChevronRight,
  Search,
  Plus,
  Loader2,
  LogIn,
  ShieldCheck,
  ClockIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  HomeIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DashboardStats {
  savedProperties: number;
  recentlyViewed: number;
  myProperties: number;
  inquiriesSent: number;
}

interface FavoritesApiResponse {
  success?: boolean;
  data?: {
    pagination?: {
      totalItems?: number;
      totalCount?: number;
    };
  };
}

interface MyPropertiesApiResponse {
  success?: boolean;
  data?: {
    pagination?: {
      totalItems?: number;
    };
    items?: unknown[];
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function UserDashboard(): ReactElement {
  const router = useRouter();
  const {
    isLoading,
    isAuthenticated,
    user,
    userRole,
    userDisplayName,
    userEmail,
    isKycVerified,
    isAdmin,
    isAgent,
    isDeveloper,
    isSociety,
    hasOnboardingApplication,
    isOnboardingPending,
    isOnboardingRejected,
    needsInfo,
  } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    savedProperties: 0,
    recentlyViewed: 0,
    myProperties: 0,
    inquiriesSent: 0,
  });

  // ─── Role-based redirects ───────────────────────────────────
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (isAdmin) {
      void router.replace('/admin');
      return;
    }
    // Note: useAuth treats admin as agent/developer/society too
    // So we check the raw role
    if (userRole === 'agent') {
      void router.replace('/agent/dashboard');
      return;
    }
    if (userRole === 'developer') {
      void router.replace('/developer/dashboard');
      return;
    }
    if (userRole === 'society') {
      void router.replace('/society/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, isAdmin, userRole, router]);

  // ─── Fetch user stats ───────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Favorites count
      const favRes = await fetch('/api/favorites?mode=list&page=1&limit=1');
      if (favRes.ok) {
        const favData = (await favRes.json()) as FavoritesApiResponse;
        const total =
          favData?.data?.pagination?.totalItems ??
          favData?.data?.pagination?.totalCount ??
          0;
        setStats((prev) => ({
          ...prev,
          savedProperties: typeof total === 'number' ? total : 0,
        }));
      }
    } catch {
      // Silent fail — stats are best-effort
    }

    try {
      // My properties count
      const myRes = await fetch('/api/my-properties?page=1&limit=1');
      if (myRes.ok) {
        const myData = (await myRes.json()) as MyPropertiesApiResponse;
        const total =
          myData?.data?.pagination?.totalItems ??
          myData?.data?.items?.length ??
          0;
        setStats((prev) => ({
          ...prev,
          myProperties: typeof total === 'number' ? total : 0,
        }));
      }
    } catch {
      // Silent fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ─── Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#029bba] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Unauthenticated State ──────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Login Required
          </h1>
          <p className="text-gray-500 mb-6">
            Please login to access your dashboard and manage your properties.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?callbackUrl=/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#027a94] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:border-[#029bba] hover:text-[#029bba] transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Redirecting other roles ────────────────────────────────
  if (isAdmin || userRole === 'agent' || userRole === 'developer' || userRole === 'society') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#029bba] animate-spin" />
      </div>
    );
  }

  // ─── Compute UI flags (V6.8.2: Smart Priority Hierarchy) ────
  // Show ONLY ONE banner at a time based on user's actual state
  // Prevents contradictory messages (e.g., "Verify CNIC" + "Application Pending")

  const ownerStatus = (user as { ownerVerificationStatus?: string })?.ownerVerificationStatus;
  const isVerifiedOwner = (user as { isVerifiedOwner?: boolean })?.isVerifiedOwner;
  const isOwnerPending = ownerStatus === 'pending';
  const isOwnerRejected = ownerStatus === 'rejected';

  // Priority hierarchy — highest priority wins, others are hidden
  // Business logic: CNIC is submitted AS PART OF onboarding/owner verification
  // So if user has ANY active application, we don't nag them to "verify CNIC" again

  const hasActiveApplication =
    isOnboardingPending ||           // Agent/dev/society application in review
    isOnboardingRejected ||          // Application was rejected
    needsInfo ||                     // Admin requested more info
    isOwnerPending ||                // Owner verification in review
    isOwnerRejected;                 // Owner verification was rejected

  // Only show KYC banner if user has NO active application AND is not verified
  // (they haven't started ANY verification process yet)
  const showKycRequiredBanner = !isKycVerified && !hasActiveApplication && !isVerifiedOwner;

  // Application status banners (mutually exclusive)
  const showPendingBanner = isOnboardingPending;
  const showRejectedBanner = isOnboardingRejected;
  const showInfoRequiredBanner = needsInfo;

  // Owner-specific banners (only show if NO onboarding application exists)
  const showOwnerVerifiedBadge = isVerifiedOwner && !hasOnboardingApplication;
  const showOwnerPendingBanner = isOwnerPending && !isOnboardingPending && !isOnboardingRejected && !needsInfo;
  const showOwnerRejectedBanner = isOwnerRejected && !isOnboardingPending && !isOnboardingRejected && !needsInfo;

  // Success badge (only if verified AND no active application)
  const showKycVerifiedBadge = isKycVerified && !hasOnboardingApplication && !isVerifiedOwner;

  // Upgrade CTA (only if no active application)
  const showUpgradeCta = !hasOnboardingApplication && !isVerifiedOwner;

  const userInitial =
    userDisplayName?.charAt(0).toUpperCase() ||
    userEmail?.charAt(0).toUpperCase() ||
    'U';

  // ─── Quick Action Cards ─────────────────────────────────────
  const quickActions = [
    {
      icon: Heart,
      title: 'Saved Properties',
      description: 'View your favorite listings',
      count: stats.savedProperties,
      href: '/saved-properties',
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      disabled: false,
    },
    {
      icon: Clock,
      title: 'Recently Viewed',
      description: 'Properties you viewed',
      count: stats.recentlyViewed,
      href: '/properties',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
      disabled: false,
    },
    {
      icon: MessageSquare,
      title: 'My Inquiries',
      description: 'Coming soon',
      count: stats.inquiriesSent,
      href: '#',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-50',
      disabled: true,
    },
    {
      icon: Bell,
      title: 'Price Alerts',
      description: 'Coming soon',
      count: 0,
      href: '#',
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-50',
      disabled: true,
    },
  ];

  // ─── Browse Options ─────────────────────────────────────────
  const browseOptions = [
    {
      icon: Building,
      title: 'Browse Properties',
      description: 'Find your dream property',
      href: '/properties',
    },
    {
      icon: HomeIcon,
      title: 'View Projects',
      description: 'Explore new developments',
      href: '/projects',
    },
    {
      icon: Search,
      title: 'Search by Area',
      description: 'Find properties near you',
      href: '/properties',
    },
  ];

  return (
    <>
      <Head>
        <title>My Dashboard | Highrise.pk</title>
        <meta
          name="description"
          content="Manage your saved properties, inquiries, and alerts on Highrise.pk"
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ─── Header ──────────────────────────────────────── */}
        <div className="bg-gradient-to-b from-[#041c2c] via-[#06283b] to-[#052235]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                  {userInitial}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Welcome, {userDisplayName || 'User'}!
                  </h1>
                  <p className="text-white/80 text-sm">{userEmail}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>

                {/* V6.8.2: Smart header CTA based on user state */}
                {isKycVerified ? (
                  <Link
                    href="/add-property"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Add Property
                  </Link>
                ) : isOnboardingPending || isOwnerPending ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba]/20 text-white text-sm font-semibold border border-white/20">
                    <ClockIcon className="w-4 h-4" />
                    Application Pending
                  </div>
                ) : isOnboardingRejected || isOwnerRejected ? (
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    Contact Support
                  </Link>
                ) : needsInfo ? (
                  <Link
                    href="/onboarding/business"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-lg"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Complete Info
                  </Link>
                ) : (
                  <Link
                    href="/owner/verify"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify to List
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content ─────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ─── KYC Required Banner ──────────────────────── */}
          {showKycRequiredBanner && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4 border-[#029bba] bg-[#eff6ff] rounded-r-xl">
              <ShieldCheck className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#004063]">
                  Identity Verification Required
                </p>
                <p className="text-xs text-[#004063]/80 mt-1">
                  Complete your CNIC verification to list properties on Highrise.pk.
                  This protects buyers and ensures a trusted marketplace.
                </p>
                <Link
                  href="/owner/verify"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#029bba] hover:underline"
                >
                  Start Verification
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* ─── Onboarding Pending Banner ───────────────── */}
          {showPendingBanner && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4 border-[#029bba] bg-[#eff6ff] rounded-r-xl">
              <ClockIcon className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#004063]">
                  Application Under Review
                </p>
                <p className="text-xs text-[#004063]/80 mt-1">
                  Your professional account application has been received. Our compliance
                  team typically reviews submissions within 1–3 business days. You will
                  receive an email when a decision is made.
                </p>
              </div>
            </div>
          )}

          {/* ─── Onboarding Rejected Banner ──────────────── */}
          {showRejectedBanner && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">
                  Application Not Approved
                </p>
                <p className="text-xs text-red-800 mt-1">
                  Your professional account application was not approved. Please contact
                  our support team for details, or you may reapply after 30 days.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-900 hover:underline"
                >
                  Contact Support
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* ─── Info Required Banner ────────────────────── */}
          {showInfoRequiredBanner && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4 border-amber-500 bg-amber-50 rounded-r-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Additional Information Required
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Our compliance team needs additional information to complete your
                  application. Please check your email for details.
                </p>
              </div>
            </div>
          )}

          {/* ─── KYC Verified Badge (V6.8.2: only if no application) ── */}
          {showKycVerifiedBadge && (
            <div className="mb-6 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Identity verified — you can now list up to 3 personal properties.
              </p>
            </div>
          )}

          {/* ─── Owner Verified Badge (V6.8.2: smart priority) ── */}
          {showOwnerVerifiedBadge && (
            <div className="mb-6 flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    You are a Verified Owner
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your identity has been confirmed. List your properties with the Verified Owner badge.
                  </p>
                </div>
              </div>
              <Link
                href="/owner/dashboard"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Owner Portal
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* ─── Owner Verification Pending (V6.8.2) ─────────── */}
          {showOwnerPendingBanner && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4 border-[#029bba] bg-[#eff6ff] rounded-r-xl">
              <ClockIcon className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#004063]">
                  Owner Verification Under Review
                </p>
                <p className="text-xs text-[#004063]/80 mt-1">
                  Your CNIC documents are being reviewed. Usually 24–48 hours. We will email you when approved.
                </p>
                <Link
                  href="/owner/verify"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#029bba] hover:underline"
                >
                  Check Status
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* ─── Owner Verification Rejected (V6.8.2) ────────── */}
          {showOwnerRejectedBanner && (
            <div className="mb-6 flex items-start gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">
                  Owner Verification Not Approved
                </p>
                <p className="text-xs text-red-800 mt-1">
                  Your verification was not approved. Contact support for assistance.
                </p>
                <a
                  href="https://wa.me/923335877106"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-900 hover:underline"
                >
                  Contact Support
                  <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* ─── Quick Stats ──────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action) => {
              const cardInner = (
                <div
                  className={cx(
                    'p-5 transition-all duration-300 group border border-gray-100 bg-white rounded-2xl shadow-sm h-full',
                    action.disabled
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer hover:shadow-md hover:border-[#029bba]/30'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cx('w-12 h-12 rounded-xl flex items-center justify-center', action.iconBg)}>
                      <action.icon className={cx('w-6 h-6', action.iconColor)} />
                    </div>
                    {action.count > 0 && (
                      <span className="text-2xl font-bold text-gray-800">
                        {action.count}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-[#029bba] transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {action.description}
                  </p>
                </div>
              );

              if (action.disabled) {
                return <div key={action.title}>{cardInner}</div>;
              }
              return (
                <Link key={action.title} href={action.href} className="block">
                  {cardInner}
                </Link>
              );
            })}
          </div>

          {/* ─── My Properties ───────────────────────────── */}
          <div className="p-6 mb-8 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                My Properties
              </h2>
              {stats.myProperties > 0 && (
                <Link
                  href="/my-properties"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:border-[#029bba] hover:text-[#029bba] transition-colors"
                >
                  View All
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {stats.myProperties === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-600 font-medium mb-2">
                  No Properties Listed Yet
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {isKycVerified
                    ? 'Start by posting your first property. As a personal user you can list up to 3 properties.'
                    : 'Complete CNIC verification to start listing your properties.'}
                </p>
                {isKycVerified ? (
                  <Link
                    href="/add-property"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Property
                  </Link>
                ) : (
                  <Link
                    href="/owner/verify"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify to List Property
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600 mb-2">
                  You have <strong>{stats.myProperties}</strong> propert
                  {stats.myProperties === 1 ? 'y' : 'ies'} listed.
                </p>
                <Link
                  href="/my-properties"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
                >
                  Manage Properties
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* ─── Browse Section ──────────────────────────── */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Browse Properties
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {browseOptions.map((option) => (
              <Link key={option.title} href={option.href} className="block">
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center group-hover:bg-[#029bba] transition-colors">
                      <option.icon className="w-6 h-6 text-[#029bba] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-[#029bba] transition-colors">
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ─── Become Professional CTA ────────────────── */}
          {showUpgradeCta && (
            <div className="p-6 bg-gradient-to-br from-[#029bba]/5 to-[#004063]/10 border border-[#029bba]/20 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                    <Briefcase className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      Are you a Real Estate Professional?
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Upgrade your account to unlock unlimited listings, lead management, and premium tools.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Agent */}
                  <Link
                    href="/onboarding/business"
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#029bba] hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-[#029bba] transition-colors">
                        Register as Agent
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sell client properties — unlimited listings
                      </p>
                    </div>
                  </Link>

                  {/* Developer */}
                  <Link
                    href="/onboarding/developer"
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#029bba] hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#029bba]/20 transition-colors">
                      <Building className="w-5 h-5 text-[#029bba]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-[#029bba] transition-colors">
                        Register as Developer
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Manage projects, units & installments
                      </p>
                    </div>
                  </Link>

                  {/* Society */}
                  <Link
                    href="/onboarding/society"
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#029bba] hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-[#029bba] transition-colors">
                        Register as Society
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Manage plots, blocks & NOC verification
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ========== END OF FILE ==========