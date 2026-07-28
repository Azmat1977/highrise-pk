// components/society/SocietyLayout.tsx
// Highrise.pk — Society Portal Layout
// Sidebar + topbar for all society dashboard pages
// Mirrors AdminLayout pattern — NO framer-motion | NO as any | NO localStorage
// Active color: #029bba (Rule 12 — purple only for developer badges)

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  FileText,
  LogOut,
  Menu,
  X,
  Home,
  Settings,
  ChevronRight,
  Shield,
  BarChart3,
  Layers,
  ClipboardList,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocietyLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactElement;
  badge?: string;
  comingSoon?: boolean;
}

interface SocietyStatusBannerProps {
  status: string;
  infoRequiredReason?: string;
  rejectionReason?: string;
}

// ─── Status banner sub-component ─────────────────────────────────────────────

function SocietyStatusBanner({
  status,
  infoRequiredReason,
  rejectionReason,
}: SocietyStatusBannerProps): React.ReactElement | null {
  if (status === 'approved') return null;

  if (status === 'pending') {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-[#029bba] bg-[#eff6ff] rounded-r-xl text-sm mb-4">
        <Clock className="w-4 h-4 text-[#029bba] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[#004063]">Application Under Review</p>
          <p className="text-xs text-[#004063]/80 mt-0.5">
            Our compliance team typically reviews submissions within 1–3 business days.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'info_required') {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-amber-500 bg-amber-50 rounded-r-xl text-sm mb-4">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900">Additional Information Required</p>
          {infoRequiredReason && (
            <p className="text-xs text-amber-800 mt-0.5">{infoRequiredReason}</p>
          )}
          <p className="text-xs text-amber-800 mt-0.5">
            Please check your email or{' '}
            <Link href="/contact" className="underline font-medium">
              contact support
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-red-500 bg-red-50 rounded-r-xl text-sm mb-4">
        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900">Application Not Approved</p>
          {rejectionReason && (
            <p className="text-xs text-red-800 mt-0.5">{rejectionReason}</p>
          )}
          <Link href="/contact" className="text-xs text-red-900 underline font-medium mt-0.5 inline-block">
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'suspended') {
    return (
      <div className="flex items-start gap-3 p-3 border-l-4 border-gray-400 bg-gray-50 rounded-r-xl text-sm mb-4">
        <XCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-700">Account Suspended</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Your society account has been suspended. Please{' '}
            <Link href="/contact" className="underline font-medium">
              contact support
            </Link>{' '}
            to resolve this.
          </p>
        </div>
      </div>
    );
  }

  // draft
  return (
    <div className="flex items-start gap-3 p-3 border-l-4 border-gray-300 bg-gray-50 rounded-r-xl text-sm mb-4">
      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-gray-600">Application Draft</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Your onboarding application was saved as a draft and not yet submitted.
        </p>
        <Link
          href="/onboarding/society"
          className="text-xs text-[#029bba] font-semibold underline mt-0.5 inline-block"
        >
          Complete Application →
        </Link>
      </div>
    </div>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/society/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    name: 'My Profile',
    href: '/society/profile',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    name: 'Plot Inventory',
    href: '/society/plots',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    name: 'Blocks & Phases',
    href: '/society/blocks',
    icon: <MapPin className="w-5 h-5" />,
    comingSoon: true,
  },
  {
    name: 'Inquiries',
    href: '/society/inquiries',
    icon: <MessageSquare className="w-5 h-5" />,
    comingSoon: true,
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocietyLayout({
  children,
}: SocietyLayoutProps): React.ReactElement {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Society profile status (fetched for sidebar banner)
  const [profileStatus, setProfileStatus] = useState<string>('pending');
  const [infoRequiredReason, setInfoRequiredReason] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [societyName, setSocietyName] = useState<string>('');
  const [statusLoaded, setStatusLoaded] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      void router.replace('/login?callbackUrl=/society/dashboard');
      return;
    }
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== 'society' && role !== 'admin') {
      void router.replace('/dashboard');
    }
  }, [sessionStatus, session, router]);

  // ── Fetch own profile status for sidebar banner ─────────────────────────────

  const fetchProfileStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/society/profile', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json() as {
        success: boolean;
        profile?: {
          status?: string;
          infoRequiredReason?: string;
          rejectionReason?: string;
          societyName?: string;
        };
      };
      if (!data.success || !data.profile) return;
      setProfileStatus(data.profile.status ?? 'pending');
      setInfoRequiredReason(data.profile.infoRequiredReason ?? '');
      setRejectionReason(data.profile.rejectionReason ?? '');
      setSocietyName(data.profile.societyName ?? '');
    } catch {
      // silent — non-critical
    } finally {
      setStatusLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      void fetchProfileStatus();
    }
  }, [sessionStatus, fetchProfileStatus]);

  // ── Close mobile sidebar on route change ────────────────────────────────────

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [router.pathname]);

  // ── Active state ────────────────────────────────────────────────────────────

  const isActive = (href: string): boolean => {
    if (href === '/society/dashboard') return router.pathname === '/society/dashboard';
    return router.pathname.startsWith(href);
  };

  // ── Loading / auth pending ──────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
      </div>
    );
  }

  const authUser = session?.user as {
    name?: string;
    email?: string;
    role?: string;
  } | undefined;

  const displayName = societyName || authUser?.name || 'Society Portal';
  const userInitial = displayName.charAt(0).toUpperCase();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          mobileSidebarOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo row */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          <Link href="/society/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 leading-tight truncate text-sm">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  Society Portal
                </p>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>

          {/* Mobile close */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status banner in sidebar (collapsed: hidden) */}
        {sidebarOpen && statusLoaded && profileStatus !== 'approved' && (
          <div className="px-4 pt-4">
            <SocietyStatusBanner
              status={profileStatus}
              infoRequiredReason={infoRequiredReason}
              rejectionReason={rejectionReason}
            />
          </div>
        )}

        {/* Approved badge */}
        {sidebarOpen && statusLoaded && profileStatus === 'approved' && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-green-700">Verified Society</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 mt-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);

            if (item.comingSoon) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed"
                  title="Coming soon"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {sidebarOpen && <span>{item.name}</span>}
                  </div>
                  {sidebarOpen && (
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {sidebarOpen && <span>{item.name}</span>}
                  </div>
                  {item.badge && sidebarOpen && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-gray-100" />

          {/* Back to main site */}
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 cursor-pointer">
              <Home className="w-5 h-5" />
              {sidebarOpen && <span>View Site</span>}
            </div>
          </Link>
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-semibold shrink-0 text-sm">
              {userInitial}
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {authUser?.name ?? 'Society Admin'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {authUser?.email ?? ''}
                  </p>
                </div>
                <button
                  onClick={() => void signOut({ callbackUrl: '/login' })}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="h-full px-4 flex items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Page breadcrumb area — children can override via portal if needed */}
            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                View Site
              </Link>
              <button
                onClick={() => void signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}