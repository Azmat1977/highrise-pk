// components/admin/AdminLayout.tsx
// Highrise.pk — Admin Layout
// Enterprise-grade sidebar + topbar layout for all admin pages
// NO framer-motion | NO localStorage auth | NO inline styles | NO as any

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Home,
  UserCheck,
  Bell,
  Search,
  HelpCircle,
  Shield,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  MessagesSquare,
  Megaphone,
  FolderOpen,
  TrendingUp,
  Clock,
  Image,
  Flag,
  Database,
  MapPin,
  Bot,
  Flame,
  IdCard,
  CheckCircle,
  Zap,
  BookTemplate,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ReactElement;
  badge?: number;
  children?: MenuItem[];
}

interface SidebarStats {
  propertiesPendingApproval: number;
  projectsPendingApproval: number;
  developerVerificationsPending: number;
  agentVerificationsPending: number;
  societyApplicantsPending: number;
  unreadInquiries: number;
  emailsFailed: number;
  emailsTotal: number;
  commentsPending: number;
  newLeads: number;
  reportsOpen: number;
  applicantsPending: number;
  // V6.4.1 — Aleem AI stats
  aleemConversationsToday: number;
  aleemLeadsToday: number;
  aleemHotLeads: number;
  // V6.6.0 — Owner Verification stats
  ownerVerificationsPending: number;
  ownerVerificationsTotal: number;
}

interface AdminStatsApiResponse {
  success: boolean;
  stats?: {
    propertiesPendingApproval: number;
    projectsPendingApproval: number;
    developerVerificationsPending: number;
    agentVerificationsPending?: number;
    societyApplicantsPending?: number;
    unreadInquiries: number;
    commentsPending: number;
    newLeads: number;
    reportsOpen?: number;
    applicantsPending?: number;
    emails?: {
      total: number;
      sent: number;
      failed: number;
      pending: number;
    };
    // V6.4.1 — Aleem AI stats
    aleem?: {
      conversationsToday: number;
      leadsToday: number;
      hotLeads: number;
      activeNow: number;
    };
    // V6.6.0 — Owner Verification stats
    owners?: {
      pending: number;
      approved: number;
      rejected: number;
      suspended: number;
      total: number;
    };
  };
  message?: string;
}

interface NotificationItem {
  id: string;
  label: string;
  description: string;
  count: number;
  href: string;
  icon: React.ReactElement;
  colorClass: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_STATS: SidebarStats = {
  propertiesPendingApproval: 0,
  projectsPendingApproval: 0,
  developerVerificationsPending: 0,
  agentVerificationsPending: 0,
  societyApplicantsPending: 0,
  unreadInquiries: 0,
  emailsFailed: 0,
  emailsTotal: 0,
  commentsPending: 0,
  newLeads: 0,
  reportsOpen: 0,
  applicantsPending: 0,
  // V6.4.1 — Aleem AI stats
  aleemConversationsToday: 0,
  aleemLeadsToday: 0,
  aleemHotLeads: 0,
  // V6.6.0 — Owner Verification stats
  ownerVerificationsPending: 0,
  ownerVerificationsTotal: 0,
};

/**
 * Determine which parent menu group should be auto-expanded
 * based on the current route pathname.
 */
function getParentMenuFromRoute(pathname: string): string | null {
  if (pathname.startsWith('/admin/properties')) return 'Properties';
  if (pathname.startsWith('/admin/projects')) return 'Projects';
  if (pathname.startsWith('/admin/aleem')) return 'Aleem AI';
  if (pathname.startsWith('/admin/applications')) return 'Applications';
  if (pathname.startsWith('/admin/societies')) return 'Societies';
  if (pathname.startsWith('/admin/developers')) return 'Developers';
  if (pathname.startsWith('/admin/agents')) return 'Agents';
  if (pathname.startsWith('/admin/owners')) return 'Verified Owners';
  if (
    pathname.startsWith('/admin/blogs') ||
    pathname.startsWith('/admin/media')
  )
    return 'Content';
  if (
    pathname.startsWith('/admin/campaigns') ||
    pathname.startsWith('/admin/subscribers') ||
    pathname.startsWith('/admin/automation') ||
    pathname.startsWith('/admin/campaign-templates') ||
    pathname.startsWith('/admin/emails') ||
    pathname.startsWith('/admin/email-templates') ||
    pathname.startsWith('/admin/hero-banners')
  )
    return 'Marketing';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout({
  children,
}: AdminLayoutProps): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const authUser = session?.user;

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Stats
  const [sidebarStats, setSidebarStats] = useState<SidebarStats>(EMPTY_STATS);

  // Dropdowns
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Refs for click-outside dismissal
  const notifRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // ── Stats fetch ─────────────────────────────────────────────────────────────

  const fetchSidebarStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        credentials: 'include',
      });
      if (!res.ok) return;

      const data: AdminStatsApiResponse = await res.json();
      if (!data.success || !data.stats) return;

      setSidebarStats({
        propertiesPendingApproval: data.stats.propertiesPendingApproval,
        projectsPendingApproval: data.stats.projectsPendingApproval,
        developerVerificationsPending:
          data.stats.developerVerificationsPending,
        agentVerificationsPending:   data.stats.agentVerificationsPending ?? 0,
        societyApplicantsPending:    data.stats.societyApplicantsPending ?? 0,
        unreadInquiries: data.stats.unreadInquiries,
        emailsFailed: data.stats.emails?.failed ?? 0,
        emailsTotal: data.stats.emails?.total ?? 0,
        commentsPending: data.stats.commentsPending ?? 0,
        newLeads: data.stats.newLeads ?? 0,
        reportsOpen: data.stats.reportsOpen ?? 0,
        applicantsPending: data.stats.applicantsPending ?? 0,
        // V6.4.1 — Aleem AI stats
        aleemConversationsToday: data.stats.aleem?.conversationsToday ?? 0,
        aleemLeadsToday:         data.stats.aleem?.leadsToday ?? 0,
        aleemHotLeads:           data.stats.aleem?.hotLeads ?? 0,
        // V6.6.0 — Owner Verification stats
        ownerVerificationsPending: data.stats.owners?.pending ?? 0,
        ownerVerificationsTotal:   data.stats.owners?.total ?? 0,
      });
    } catch {
      // Silent fail — stats are non-critical UI decoration
    }
  }, []);

  // ── Side effects ────────────────────────────────────────────────────────────

  // Initial stats load
  useEffect(() => {
    fetchSidebarStats();
  }, [fetchSidebarStats]);

  // Listen for custom event from child pages to refresh stats
  useEffect(() => {
    const handler = () => fetchSidebarStats();
    window.addEventListener('refreshAdminStats', handler);
    return () => window.removeEventListener('refreshAdminStats', handler);
  }, [fetchSidebarStats]);

  // ─── AUTO-REFRESH: Poll stats every 30 seconds ───
  // Only when tab is active (saves resources)
  // Enterprise pattern — same as Gmail, LinkedIn, GitHub
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        // Only fetch if tab is visible
        if (document.visibilityState === 'visible') {
          void fetchSidebarStats();
        }
      }, 30000); // 30 seconds
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Start polling on mount
    startPolling();

    // Pause polling when tab is hidden (performance)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Immediate refresh when tab becomes visible again
        void fetchSidebarStats();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSidebarStats]);

  // Auto-expand sidebar group based on current route
  useEffect(() => {
    const parent = getParentMenuFromRoute(router.pathname);
    if (!parent) return;
    setExpandedMenus((prev) =>
      prev.includes(parent) ? prev : [...prev, parent]
    );
  }, [router.pathname]);

  // Click-outside: close notification + help dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        helpRef.current &&
        !helpRef.current.contains(e.target as Node)
      ) {
        setShowHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [router.pathname]);

  // ── Derived values ──────────────────────────────────────────────────────────

  // Total notifications across ALL categories
  // Each notification type counted once — clean, no duplication
  const notificationsCount =
    sidebarStats.propertiesPendingApproval +
    sidebarStats.projectsPendingApproval +
    sidebarStats.ownerVerificationsPending +
    sidebarStats.developerVerificationsPending +
    sidebarStats.agentVerificationsPending +
    sidebarStats.societyApplicantsPending +
    sidebarStats.newLeads +
    sidebarStats.unreadInquiries +
    sidebarStats.commentsPending +
    sidebarStats.reportsOpen +
    sidebarStats.emailsFailed;

  const notifications: NotificationItem[] = [
    // ─── PROPERTIES ───
    {
      id: 'props-pending',
      label: 'Properties Pending Approval',
      description: 'Review and approve new property listings.',
      count: sidebarStats.propertiesPendingApproval,
      href: '/admin/properties/pending',
      icon: <Building2 className="w-4 h-4" />,
      colorClass: 'bg-amber-50 text-amber-700',
    },

    // ─── PROJECTS ───
    {
      id: 'projects-pending',
      label: 'Projects Pending Approval',
      description: 'New projects awaiting admin review.',
      count: sidebarStats.projectsPendingApproval,
      href: '/admin/projects/pending',
      icon: <FolderOpen className="w-4 h-4" />,
      colorClass: 'bg-blue-50 text-blue-700',
    },

    // ─── OWNER VERIFICATIONS (V6.6.0) ───
    {
      id: 'owner-verifications',
      label: 'Owner Verifications Pending',
      description: 'CNIC verifications waiting for review.',
      count: sidebarStats.ownerVerificationsPending,
      href: '/admin/owners?status=pending',
      icon: <ShieldCheck className="w-4 h-4" />,
      colorClass: 'bg-[#029bba]/10 text-[#029bba]',
    },

    // ─── DEVELOPERS ───
    {
      id: 'developers-pending',
      label: 'Developer Verifications',
      description: 'Verify developer profiles and documents.',
      count: sidebarStats.developerVerificationsPending,
      href: '/admin/developers?status=pending',
      icon: <UserCheck className="w-4 h-4" />,
      colorClass: 'bg-purple-50 text-purple-700',
    },

    // ─── AGENTS ───
    {
      id: 'agents-pending',
      label: 'Agent Verifications',
      description: 'Verify agent profiles and licenses.',
      count: sidebarStats.agentVerificationsPending,
      href: '/admin/agents?status=pending',
      icon: <UserCheck className="w-4 h-4" />,
      colorClass: 'bg-orange-50 text-orange-700',
    },

    // ─── SOCIETIES ───
    {
      id: 'societies-pending',
      label: 'Society Applications',
      description: 'Society profiles awaiting approval.',
      count: sidebarStats.societyApplicantsPending,
      href: '/admin/applications?type=society&status=pending',
      icon: <MapPin className="w-4 h-4" />,
      colorClass: 'bg-indigo-50 text-indigo-700',
    },

    // ─── LEADS & INQUIRIES ───
    {
      id: 'leads-new',
      label: 'New Leads',
      description: 'Fresh property inquiries to follow up.',
      count: sidebarStats.newLeads,
      href: '/admin/leads?status=new',
      icon: <Users className="w-4 h-4" />,
      colorClass: 'bg-teal-50 text-teal-700',
    },
    {
      id: 'inquiries-new',
      label: 'New Inquiries',
      description: 'Customers waiting for your response.',
      count: sidebarStats.unreadInquiries,
      href: '/admin/inquiries',
      icon: <MessageSquare className="w-4 h-4" />,
      colorClass: 'bg-emerald-50 text-emerald-700',
    },

    // ─── COMMENTS ───
    {
      id: 'comments-pending',
      label: 'Pending Comments',
      description: 'Comments awaiting your approval.',
      count: sidebarStats.commentsPending,
      href: '/admin/comments',
      icon: <MessagesSquare className="w-4 h-4" />,
      colorClass: 'bg-cyan-50 text-cyan-700',
    },

    // ─── REPORTS ───
    {
      id: 'reports-open',
      label: 'New Reports',
      description: 'Reported listings need admin review.',
      count: sidebarStats.reportsOpen,
      href: '/admin/reports?status=open',
      icon: <Flag className="w-4 h-4" />,
      colorClass: 'bg-red-50 text-red-700',
    },

    // ─── FAILED EMAILS ───
    {
      id: 'emails-failed',
      label: 'Failed Emails',
      description: 'Emails that failed to send. Try resending.',
      count: sidebarStats.emailsFailed,
      href: '/admin/emails?status=failed',
      icon: <Mail className="w-4 h-4" />,
      colorClass: 'bg-red-50 text-red-700',
    },
    // ─── V6.6.0: Owner Verifications ───
    {
      id: 'owner-verifications',
      label: 'Owner Verifications Pending',
      description: 'CNIC verifications waiting for review.',
      count: sidebarStats.ownerVerificationsPending,
      href: '/admin/owners?status=pending',
      icon: <ShieldCheck className="w-4 h-4" />,
      colorClass: 'bg-[#029bba]/10 text-[#029bba]',
    },
    // ─── Existing but not previously shown as notifications ───
    {
      id: 'agent-verifications',
      label: 'Agent Verifications Pending',
      description: 'Agent profiles waiting for verification.',
      count: 0, // We'd need to add agentVerificationsPending to stats — commented for now
      href: '/admin/agents?status=pending',
      icon: <UserCheck className="w-4 h-4" />,
      colorClass: 'bg-orange-50 text-orange-700',
    },
    {
      id: 'society-applicants',
      label: 'Society Applications Pending',
      description: 'Society profiles awaiting approval.',
      count: 0, // We'd need to add societyApplicantsPending to stats
      href: '/admin/applications?type=society&status=pending',
      icon: <MapPin className="w-4 h-4" />,
      colorClass: 'bg-purple-50 text-purple-700',
    },
  ];

  // ── Menu definition ─────────────────────────────────────────────────────────

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Properties',
      icon: <Building2 className="w-5 h-5" />,
      children: [
        {
          name: 'All Properties',
          href: '/admin/properties',
          icon: <Home className="w-4 h-4" />,
        },
        {
          name: 'Pending Approval',
          href: '/admin/properties/pending',
          icon: <Clock className="w-4 h-4" />,
          badge: sidebarStats.propertiesPendingApproval,
        },
        {
          name: 'Featured',
          href: '/admin/properties/featured',
          icon: <TrendingUp className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Projects',
      icon: <FolderOpen className="w-5 h-5" />,
      children: [
        {
          name: 'All Projects',
          href: '/admin/projects',
          icon: <FolderOpen className="w-4 h-4" />,
        },
        {
          name: 'Pending Approval',
          href: '/admin/projects/pending',
          icon: <Clock className="w-4 h-4" />,
          badge: sidebarStats.projectsPendingApproval,
        },
      ],
    },
    {
      name: 'Leads',
      href: '/admin/leads',
      icon: <Users className="w-5 h-5" />,
      badge: sidebarStats.newLeads,
    },
    // ── Aleem AI (V6.4.1) ──────────────────────────────────
    {
      name: 'Aleem AI',
      icon: <Bot className="w-5 h-5" />,
      badge: sidebarStats.aleemHotLeads,
      children: [
        {
          name: 'Dashboard',
          href: '/admin/aleem',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          name: 'Conversations',
          href: '/admin/aleem/conversations',
          icon: <MessagesSquare className="w-4 h-4" />,
        },
        {
          name: 'Aleem Leads',
          href: '/admin/aleem/leads',
          icon: <Flame className="w-4 h-4" />,
          badge: sidebarStats.aleemHotLeads,
        },
      ],
    },
    // ── KYC Applications Inbox ─────────────────────────────
    {
      name: 'Applications',
      icon: <UserCheck className="w-5 h-5" />,
      badge: sidebarStats.applicantsPending,
      children: [
        {
          name: 'All Applications',
          href: '/admin/applications',
          icon: <Users className="w-4 h-4" />,
        },
        {
          name: 'Agents Pending',
          href: '/admin/applications?type=agent&status=pending',
          icon: <Clock className="w-4 h-4" />,
        },
        {
          name: 'Developers Pending',
          href: '/admin/applications?type=developer&status=pending',
          icon: <Clock className="w-4 h-4" />,
        },
        {
          name: 'Societies Pending',
          href: '/admin/applications?type=society&status=pending',
          icon: <Clock className="w-4 h-4" />,
        },
      ],
    },
    // ── Verified Societies ─────────────────────────────────
    {
      name: 'Societies',
      icon: <MapPin className="w-5 h-5" />,
      children: [
        {
          name: 'All Societies',
          href: '/admin/societies',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          name: 'Pending Verification',
          href: '/admin/societies?status=pending',
          icon: <Clock className="w-4 h-4" />,
        },
        {
          name: 'Verified',
          href: '/admin/societies?status=approved',
          icon: <UserCheck className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Developers',
      icon: <UserCheck className="w-5 h-5" />,
      children: [
        {
          name: 'All Developers',
          href: '/admin/developers',
          icon: <Users className="w-4 h-4" />,
        },
        {
          name: 'Pending Verification',
          href: '/admin/developers?status=pending',
          icon: <Clock className="w-4 h-4" />,
          badge: sidebarStats.developerVerificationsPending,
        },
        {
          name: 'Verified',
          href: '/admin/developers?status=approved',
          icon: <UserCheck className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Agents',
      icon: <UserCheck className="w-5 h-5" />,
      children: [
        {
          name: 'All Agents',
          href: '/admin/agents',
          icon: <Users className="w-4 h-4" />,
        },
        {
          name: 'Pending Verification',
          href: '/admin/agents?status=pending',
          icon: <Clock className="w-4 h-4" />,
        },
        {
          name: 'Verified',
          href: '/admin/agents?status=approved',
          icon: <UserCheck className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: <Users className="w-5 h-5" />,
    },
    // ── Verified Owners System (V6.6.0) ────────────────────
    {
      name: 'Verified Owners',
      icon: <ShieldCheck className="w-5 h-5" />,
      badge: sidebarStats.ownerVerificationsPending,
      children: [
        {
          name: 'All Owners',
          href: '/admin/owners',
          icon: <Users className="w-4 h-4" />,
        },
        {
          name: 'Pending Review',
          href: '/admin/owners?status=pending',
          icon: <Clock className="w-4 h-4" />,
          badge: sidebarStats.ownerVerificationsPending,
        },
        {
          name: 'Approved',
          href: '/admin/owners?status=approved',
          icon: <ShieldCheck className="w-4 h-4" />,
        },
        {
          name: 'Rejected',
          href: '/admin/owners?status=rejected',
          icon: <X className="w-4 h-4" />,
        },
        {
          name: 'Suspended',
          href: '/admin/owners?status=suspended',
          icon: <IdCard className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Content',
      icon: <FileText className="w-5 h-5" />,
      children: [
        {
          name: 'Blog Posts',
          href: '/admin/blogs',
          icon: <FileText className="w-4 h-4" />,
        },
        {
          name: 'Media Library',
          href: '/admin/media',
          icon: <Image className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Marketing',
      icon: <Megaphone className="w-5 h-5" />,
      children: [
        {
          name: 'Hero Promotions',
          href: '/admin/hero-banners',
          icon: <Image className="w-4 h-4" />,
        },
        {
          name: 'Email History',
          href: '/admin/emails',
          icon: <Mail className="w-4 h-4" />,
          badge: sidebarStats.emailsTotal,
        },
        {
          name: 'Email Templates',
          href: '/admin/email-templates',
          icon: <FileText className="w-4 h-4" />,
        },
        {
          name: 'Campaigns',
          href: '/admin/campaigns',
          icon: <Mail className="w-4 h-4" />,
        },
        {
          name: 'Subscribers',
          href: '/admin/subscribers',
          icon: <Users className="w-4 h-4" />,
        },
        {
          name: 'Automation',
          href: '/admin/automation',
          icon: <Zap className="w-4 h-4" />,
        },
        {
          name: 'Templates',
          href: '/admin/campaign-templates',
          icon: <BookTemplate className="w-4 h-4" />,
        },
      ],
    },
    {
      name: 'Comments',
      href: '/admin/comments',
      icon: <MessagesSquare className="w-5 h-5" />,
      badge: sidebarStats.commentsPending,
    },
    {
      name: 'Inquiries',
      href: '/admin/inquiries',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: sidebarStats.unreadInquiries,
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: <Flag className="w-5 h-5" />,
      badge: sidebarStats.reportsOpen,
    },
    {
      name: 'AI Chats',
      href: '/admin/chats',
      icon: <MessagesSquare className="w-5 h-5" />,
    },
    {
      name: 'Moderation',
      href: '/admin/moderation/flagged',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      name: 'Cities',
      href: '/admin/cities',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      name: 'Construction Rates',
      href: '/admin/construction-rates',
      icon: <Database className="w-5 h-5" />,
    },
    {
      name: 'Security',
      href: '/admin/security',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  // ── Interaction handlers ────────────────────────────────────────────────────

  const toggleSubmenu = (name: string) => {
    setExpandedMenus((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  /**
   * Determines if a given href matches the current route.
   * Handles exact matches, query-param–based sub-tabs,
   * and nested paths (properties/pending etc.).
   */
  const isActive = (href: string): boolean => {
    const currentPath = router.pathname;
    const currentStatus = router.query.status as string | undefined;

    // Exact dashboard match
    if (href === '/admin') return currentPath === '/admin';

    // Simple exact-match routes
    const exactRoutes = [
      '/admin/users',
      '/admin/inquiries',
      '/admin/leads',
      '/admin/reports',
      '/admin/analytics',
      '/admin/cities',
      '/admin/settings',
      '/admin/comments',
      '/admin/chats',
    ];
    if (exactRoutes.includes(href)) return currentPath === href;

    // Applications — combined inbox (type + status query params)
    if (href.startsWith('/admin/applications')) {
      if (!currentPath.startsWith('/admin/applications')) return false;
      // Detail page: /admin/applications/[id]
      if (currentPath !== '/admin/applications') return false;
      const hrefParams = new URL(href, 'http://x').searchParams;
      const hrefType = hrefParams.get('type');
      const hrefStatus = hrefParams.get('status');
      const currentType = router.query.type as string | undefined;
      // All Applications (no filters)
      if (!hrefType && !hrefStatus) {
        return !currentType && (!currentStatus || currentStatus === 'all');
      }
      // Filtered tab
      if (hrefType && hrefStatus) {
        return currentType === hrefType && currentStatus === hrefStatus;
      }
      return false;
    }

    // Societies admin — nested path + query-param status
    if (href.startsWith('/admin/societies')) {
      if (!currentPath.startsWith('/admin/societies')) return false;
      if (currentPath !== '/admin/societies') return false;
      const hrefStatus = new URL(href, 'http://x').searchParams.get('status');
      if (!hrefStatus) return !currentStatus || currentStatus === 'all';
      return currentStatus === hrefStatus;
    }

    // Developers — handle query-param tabs
    if (href.startsWith('/admin/developers')) {
      if (currentPath !== '/admin/developers') return false;
      const hrefStatus = new URL(href, 'http://x').searchParams.get('status');
      if (!hrefStatus) return !currentStatus || currentStatus === 'all';
      return currentStatus === hrefStatus;
    }

    // Agents — handle query-param tabs
    if (href.startsWith('/admin/agents')) {
      if (currentPath !== '/admin/agents') return false;
      const hrefStatus = new URL(href, 'http://x').searchParams.get('status');
      if (!hrefStatus) return !currentStatus || currentStatus === 'all';
      return currentStatus === hrefStatus;
    }

    // Verified Owners — handle query-param tabs + detail pages
    if (href.startsWith('/admin/owners')) {
      if (!currentPath.startsWith('/admin/owners')) return false;
      
      // If we are on a detail page like /admin/owners/123, keep the parent menu active
      if (currentPath.split('/').length > 3) return href === '/admin/owners';

      const hrefStatus = new URL(href, 'http://x').searchParams.get('status');
      if (!hrefStatus) return !currentStatus || currentStatus === 'all';
      return currentStatus === hrefStatus;
    }

    // Properties — nested paths
    if (href.startsWith('/admin/properties')) {
      if (!currentPath.startsWith('/admin/properties')) return false;
      return currentPath === href;
    }

    // Projects — nested paths
    if (href.startsWith('/admin/projects')) {
      if (!currentPath.startsWith('/admin/projects')) return false;
      return currentPath === href;
    }

    // Content, Marketing, and other simple sub-pages
    return currentPath === href;
  };

  const isMenuGroupActive = (item: MenuItem): boolean => {
    if (item.href && isActive(item.href)) return true;
    return (
      item.children?.some((child) => child.href && isActive(child.href)) ??
      false
    );
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Clear local unread count for inquiries immediately (optimistic UI)
    if (item.id === 'inquiries-new') {
      setSidebarStats((prev) => ({ ...prev, unreadInquiries: 0 }));
    }
    setShowNotifications(false);

    // If already on developers page, dispatch tab-change event instead of navigate
    if (
      item.id === 'developers-pending' &&
      router.pathname === '/admin/developers'
    ) {
      window.dispatchEvent(
        new CustomEvent('changeDevTab', { detail: 'pending' })
      );
      return;
    }

    void router.push(item.href);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderMenuItem = (
    item: MenuItem,
    isChild = false
  ): React.ReactElement => {
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isExpanded = expandedMenus.includes(item.name);
    const groupActive = isMenuGroupActive(item);

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
              groupActive
                ? 'bg-[#029bba]/10 text-[#029bba]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {sidebarOpen && <span>{item.name}</span>}
            </div>
            {sidebarOpen && (
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            )}
          </button>

          {/* 
            Tailwind max-height transition replaces framer-motion.
            max-h-0 → max-h-96 with overflow-hidden gives smooth
            expand/collapse without any animation library.
          */}
          <div
            className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-200 ease-in-out ${
              isExpanded && sidebarOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {item.children?.map((child) => renderMenuItem(child, true))}
          </div>
        </div>
      );
    }

    const href = item.href ?? '#';
    const active = isActive(href);

    return (
      <Link key={item.name} href={href}>
        <div
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
            active
              ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          } ${isChild ? 'ml-2' : ''}`}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            {sidebarOpen && <span>{item.name}</span>}
          </div>

          {/* Badge — only shown when sidebar is expanded */}
          {typeof item.badge === 'number' &&
            item.badge > 0 &&
            sidebarOpen && (
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
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Mobile overlay (replaces framer-motion AnimatePresence) ── */}
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
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 leading-tight truncate">
                  Highrise.pk
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  Admin Panel
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-semibold shrink-0">
              {authUser?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>

            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {authUser?.name ?? 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {authUser?.email ?? 'admin@highrise.pk'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
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
        {/* ── Top header ── */}
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

            {/* Search — visual placeholder (wired in Section 10) */}
            <div className="hidden md:flex items-center flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search properties, users, projects..."
                  disabled
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 cursor-not-allowed outline-none"
                  aria-label="Global search (coming soon)"
                />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Help dropdown */}
              <div className="relative" ref={helpRef}>
                <button
                  onClick={() => {
                    setShowHelp((v) => !v);
                    setShowNotifications(false);
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                  aria-label="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>

                {showHelp && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-lg z-40 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Need help?
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      For support or questions about the Highrise.pk Admin
                      Panel, contact the team below.
                    </p>
                    <div className="space-y-2 text-xs">
                      <a
                        href="mailto:info@highrise.pk"
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        <span>Email support</span>
                        <span className="text-[11px] text-gray-500">
                          info@highrise.pk
                        </span>
                      </a>
                      <p className="text-[11px] text-gray-500">
                        Urgent issues:{' '}
                        <span className="font-medium">
                          admin@highrise.pk
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setShowNotifications((v) => !v);
                    setShowHelp(false);
                  }}
                  className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                  aria-label={`Notifications${notificationsCount > 0 ? ` — ${notificationsCount} pending` : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notificationsCount > 99 ? '99+' : notificationsCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-40 overflow-hidden">
                    {/* Enhanced header with gradient */}
                    <div className="px-5 py-4 bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Notifications
                        </h3>
                        {notificationsCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
                            {notificationsCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/80">
                        {notificationsCount > 0
                          ? `${notificationsCount} item${notificationsCount > 1 ? 's' : ''} need attention`
                          : 'All caught up — great work!'}
                      </p>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {notifications.some((n) => n.count > 0) ? (
                        <div className="divide-y divide-gray-50">
                          {notifications
                            .filter((n) => n.count > 0)
                            .map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => handleNotificationClick(n)}
                                className="w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                              >
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.colorClass} group-hover:scale-110 transition-transform`}
                                >
                                  {n.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#029bba] transition-colors">
                                      {n.label}
                                    </p>
                                    <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-2 text-[11px] font-bold rounded-full bg-red-500 text-white shrink-0">
                                      {n.count > 99 ? '99+' : n.count}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-1">
                                    {n.description}
                                  </p>
                                </div>
                              </button>
                            ))}
                        </div>
                      ) : (
                        <div className="px-6 py-12 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                          </div>
                          <p className="text-sm font-bold text-gray-800 mb-1">
                            You&apos;re all caught up!
                          </p>
                          <p className="text-xs text-gray-500">
                            No pending items need attention right now.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer with auto-refresh indicator */}
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Auto-refreshes every 30s
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          void fetchSidebarStats();
                        }}
                        className="text-[11px] text-[#029bba] font-semibold hover:underline"
                      >
                        Refresh now
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View Site */}
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                View Site
              </Link>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}