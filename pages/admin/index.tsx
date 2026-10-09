// pages/admin/index.tsx
// Highrise.pk -- Admin Dashboard Homepage
// Platform intelligence overview + property breakdown + developer audit + security feed
// Strict Design System Lock: icons from @/lib/design-system/icons | tokens from @/lib/design-system/tokens
// No inline styles | No recharts dead code | No mock data | Pure ASCII comments

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { icons } from '@/lib/design-system/icons';
import { colors } from '@/lib/design-system/tokens';
import { typography } from '@/lib/design-system/typography';
import AdminLayout from '@/components/admin/AdminLayout';

// ============================================================================
// TYPES
// ============================================================================

interface DeveloperPerformance {
  id: string;
  name: string;
  totalLeads: number;
  responseRate: number;
  ignoredLeads: number;
  status: 'active' | 'warning' | 'critical';
}

interface SecurityLogEntry {
  id: string;
  action: string;
  admin: string;
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  time: string;
}

interface StatsApiResponse {
  success: boolean;
  stats?: {
    propertiesPendingApproval: number;
    propertiesVerified?: number;
    propertiesRejected?: number;
    propertiesDraft?: number;
    projectsPendingApproval: number;
    developerVerificationsPending: number;
    agentVerificationsPending: number;
    societyApplicantsPending: number;
    societyAlertsActive: number;
    societiesUnpublished: number;
    unreadInquiries: number;
    commentsPending: number;
    newLeads: number;
    totalLeads: number;
    reportsOpen: number;
    applicantsPending: number;
    totalProperties: number;
    totalUsers: number;
    verifiedDevelopers: number;
    verifiedAgents: number;
    verifiedSocieties: number;
    totalSocieties: number;
    publishedSocieties: number;
    activeInquiries: number;
    blogDrafts: number;
    users?: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      banned: number;
      trash: number;
    };
    emails?: {
      total: number;
      sent: number;
      failed: number;
      pending: number;
    };
    aleem?: {
      conversationsToday: number;
      leadsToday: number;
      hotLeads: number;
      activeNow: number;
    };
    owners?: {
      pending: number;
      approved: number;
      rejected: number;
      suspended: number;
      total: number;
    };
  };
  performance?: DeveloperPerformance[];
  logs?: SecurityLogEntry[];
  message?: string;
}

interface DashboardStats {
  propertiesTotal: number;
  propertiesPending: number;
  propertiesVerified: number;
  propertiesRejected: number;
  propertiesDraft: number;
  users: number;
  developers: number;
  agents: number;
  societies: number;
  inquiries: number;
  unpublishedSocieties: number;
  activeAlerts: number;
}

// ============================================================================
// STAT CARD COMPONENT (Rule Set A Compliant -- No inline style)
// ============================================================================

type ColorVariant = 'teal' | 'emerald' | 'blue' | 'cyan' | 'purple' | 'amber' | 'red' | 'gray';

interface StatCardConfig {
  title: string;
  value: number;
  subValue?: string;
  icon: React.ReactElement;
  variant: ColorVariant;
  href: string;
}

interface StatCardProps {
  config: StatCardConfig;
  loading: boolean;
}

const variantStyles: Record<ColorVariant, { iconBg: string; iconColor: string; hoverBorder: string }> = {
  teal: {
    iconBg: 'bg-[#029bba]/10',
    iconColor: 'text-[#029bba]',
    hoverBorder: 'hover:border-[#029bba]/40',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    hoverBorder: 'hover:border-emerald-300',
  },
  blue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-300',
  },
  cyan: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-300',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-[#7c3aed]',
    hoverBorder: 'hover:border-purple-300',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-300',
  },
  red: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    hoverBorder: 'hover:border-red-300',
  },
  gray: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    hoverBorder: 'hover:border-gray-300',
  },
};

function StatCard({ config, loading }: StatCardProps): React.ReactElement {
  const style = variantStyles[config.variant];

  return (
    <Link href={config.href}>
      <div
        className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md ${style.hoverBorder} transition-all duration-200 p-5 cursor-pointer group h-full flex flex-col justify-between`}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${style.iconBg} ${style.iconColor}`}
          >
            {config.icon}
          </div>
          <icons.ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] transition-colors" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-[#029bba] transition-colors">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-gray-100 rounded animate-pulse" />
            ) : (
              config.value.toLocaleString()
            )}
          </h3>
          <p className="text-sm font-medium text-gray-600">{config.title}</p>
          {config.subValue && (
            <p className="text-xs text-gray-400 mt-1">{config.subValue}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN ADMIN DASHBOARD COMPONENT
// ============================================================================

export default function AdminDashboard(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats>({
    propertiesTotal: 0,
    propertiesPending: 0,
    propertiesVerified: 0,
    propertiesRejected: 0,
    propertiesDraft: 0,
    users: 0,
    developers: 0,
    agents: 0,
    societies: 0,
    inquiries: 0,
    unpublishedSocieties: 0,
    activeAlerts: 0,
  });

  const [devPerformance, setDevPerformance] = useState<DeveloperPerformance[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      const data = (await res.json()) as StatsApiResponse;

      if (!res.ok || !data.success || !data.stats) {
        setErrorMsg(data.message ?? 'Failed to load dashboard data.');
        return;
      }

      setStats({
        propertiesTotal: data.stats.totalProperties ?? 0,
        propertiesPending: data.stats.propertiesPendingApproval ?? 0,
        propertiesVerified: data.stats.propertiesVerified ?? 0,
        propertiesRejected: data.stats.propertiesRejected ?? 0,
        propertiesDraft: data.stats.propertiesDraft ?? 0,
        users: data.stats.totalUsers ?? 0,
        developers: data.stats.verifiedDevelopers ?? 0,
        agents: data.stats.verifiedAgents ?? 0,
        societies: data.stats.verifiedSocieties ?? 0,
        inquiries: data.stats.activeInquiries ?? 0,
        unpublishedSocieties: data.stats.societiesUnpublished ?? 0,
        activeAlerts: data.stats.societyAlertsActive ?? 0,
      });

      if (data.performance) setDevPerformance(data.performance);
      if (data.logs) setSecurityLogs(data.logs);
    } catch {
      setErrorMsg('Network error. Please try again.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchDashboardData().finally(() => setLoading(false));
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Property Pipeline Cards
  const propertyCards = [
    {
      title: 'Total Properties',
      value: stats.propertiesTotal,
      icon: <icons.Building2 className="w-5 h-5 text-[#029bba]" />,
      bg: 'bg-teal-50/70',
      border: 'border-[#029bba]/20 hover:border-[#029bba]/50',
      badgeClass: 'bg-[#029bba] text-white',
      badgeText: 'All Listings',
      href: '/admin/properties',
    },
    {
      title: 'Pending Review',
      value: stats.propertiesPending,
      icon: <icons.Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50/70',
      border: 'border-amber-200 hover:border-amber-400',
      badgeClass: 'bg-amber-500 text-white',
      badgeText: 'Action Required',
      href: '/admin/properties/pending',
    },
    {
      title: 'Verified / Live',
      value: stats.propertiesVerified,
      icon: <icons.BadgeCheck className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200 hover:border-emerald-400',
      badgeClass: 'bg-emerald-600 text-white',
      badgeText: 'Public Search',
      href: '/admin/properties?status=approved',
    },
    {
      title: 'Draft Listings',
      value: stats.propertiesDraft,
      icon: <icons.FileText className="w-5 h-5 text-gray-600" />,
      bg: 'bg-gray-50',
      border: 'border-gray-200 hover:border-gray-400',
      badgeClass: 'bg-gray-500 text-white',
      badgeText: 'Unpublished',
      href: '/admin/properties?status=draft',
    },
    {
      title: 'Rejected',
      value: stats.propertiesRejected,
      icon: <icons.Ban className="w-5 h-5 text-red-600" />,
      bg: 'bg-red-50/70',
      border: 'border-red-200 hover:border-red-400',
      badgeClass: 'bg-red-500 text-white',
      badgeText: 'Disapproved',
      href: '/admin/properties?status=rejected',
    },
  ];

  // Platform Overview Cards
  const platformCards: StatCardConfig[] = [
    {
      title: 'Total Users',
      value: stats.users,
      icon: <icons.Users className="w-5 h-5" />,
      variant: 'emerald',
      href: '/admin/users',
    },
    {
      title: 'Verified Developers',
      value: stats.developers,
      icon: <icons.BadgeCheck className="w-5 h-5" />,
      variant: 'blue',
      href: '/admin/developers?status=approved',
    },
    {
      title: 'Verified Agents',
      value: stats.agents,
      icon: <icons.UserCheck className="w-5 h-5" />,
      variant: 'cyan',
      href: '/admin/agents?status=approved',
    },
    {
      title: 'Verified Societies',
      value: stats.societies,
      subValue: stats.unpublishedSocieties > 0 ? `${stats.unpublishedSocieties} unpublished` : undefined,
      icon: <icons.MapPin className="w-5 h-5" />,
      variant: 'purple',
      href: '/admin/societies',
    },
    {
      title: 'Active Inquiries',
      value: stats.inquiries,
      icon: <icons.Mail className="w-5 h-5" />,
      variant: 'amber',
      href: '/admin/inquiries',
    },
    {
      title: 'Society Alerts',
      value: stats.activeAlerts,
      subValue: stats.activeAlerts > 0 ? 'Active risk alerts' : 'All clear',
      icon: <icons.AlertTriangle className="w-5 h-5" />,
      variant: 'red',
      href: '/admin/societies?riskLevel=high_risk',
    },
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={typography.pageTitle}>Admin Dashboard</h1>
              <p className={typography.pageSubtitle}>
                Real-time platform intelligence and inventory oversight.
              </p>
            </div>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:border-[#029bba] hover:text-[#029bba] transition-colors disabled:opacity-50 shadow-sm"
            >
              <icons.RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Stats'}
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-3 p-4 border-l-4 border-[#ef4444] bg-[#fef2f2] rounded-r-xl">
              <icons.ShieldAlert className="w-5 h-5 text-[#ef4444] shrink-0" />
              <p className="text-sm font-semibold text-[#991b1b]">{errorMsg}</p>
            </div>
          )}

          {/* SECTION 1: PROPERTY PIPELINE BREAKDOWN (P2 ACTIVE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <icons.Building2 className="w-5 h-5 text-[#029bba]" />
                <h2 className={typography.sectionTitlePlain}>Property Pipeline Breakdown</h2>
              </div>
              <Link
                href="/admin/properties"
                className="text-xs font-bold text-[#029bba] hover:underline flex items-center gap-1"
              >
                Manage All
                <icons.ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {propertyCards.map((cardItem) => (
                <Link key={cardItem.title} href={cardItem.href}>
                  <div
                    className={`p-4 rounded-2xl border ${cardItem.border} ${cardItem.bg} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-white shadow-xs group-hover:scale-105 transition-transform">
                        {cardItem.icon}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cardItem.badgeClass}`}>
                        {cardItem.badgeText}
                      </span>
                    </div>

                    <div>
                      <div className="text-2xl font-black text-[#004063] tracking-tight group-hover:text-[#029bba] transition-colors">
                        {loading ? (
                          <span className="inline-block w-12 h-7 bg-white/60 rounded animate-pulse" />
                        ) : (
                          cardItem.value.toLocaleString()
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">{cardItem.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* SECTION 2: PLATFORM OVERVIEW GRID */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <icons.Activity className="w-5 h-5 text-[#004063]" />
              <h2 className={typography.sectionTitlePlain}>Platform Ecosystem Overview</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {platformCards.map((cardConfig) => (
                <StatCard key={cardConfig.title} config={cardConfig} loading={loading} />
              ))}
            </div>
          </div>

          {/* SECTION 3: INTELLIGENCE GRID */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Developer Performance Audit */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className={typography.sectionTitle}>
                    <icons.Zap className="w-4 h-4 text-[#029bba]" />
                    Developer Performance Audit
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Lead response and negligence tracking
                  </p>
                </div>
                <Link href="/admin/developers?status=approved">
                  <span className="text-xs text-[#029bba] font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                    View All
                    <icons.ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>

              {loading ? (
                <div className="p-10 flex items-center justify-center">
                  <icons.Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
                </div>
              ) : devPerformance.length === 0 ? (
                <div className="p-10 text-center">
                  <icons.BadgeCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No approved developers yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="text-left px-5 py-3 font-semibold">Developer</th>
                        <th className="text-left px-4 py-3 font-semibold">Response Rate</th>
                        <th className="text-center px-4 py-3 font-semibold">Total Leads</th>
                        <th className="text-center px-4 py-3 font-semibold text-red-600">Ignored</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {devPerformance.map((dev) => (
                        <tr key={dev.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-800">{dev.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    dev.responseRate > 80
                                      ? 'bg-emerald-500'
                                      : dev.responseRate > 50
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(Math.max(dev.responseRate, 0), 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600">
                                {dev.responseRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700 font-medium">
                            {dev.totalLeads}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {dev.ignoredLeads > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                                <icons.UserX className="w-3 h-3" />
                                {dev.ignoredLeads}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {dev.status === 'critical' && (
                              <span className="inline-flex text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                Slacking
                              </span>
                            )}
                            {dev.status === 'warning' && (
                              <span className="inline-flex text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                Slow
                              </span>
                            )}
                            {dev.status === 'active' && (
                              <span className="inline-flex text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Security Event Feed */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <icons.ShieldAlert className="w-4 h-4 text-red-500" />
                  Security Feed
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                    Live
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {loading ? (
                  <div className="p-10 flex items-center justify-center">
                    <icons.Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                  </div>
                ) : securityLogs.length === 0 ? (
                  <div className="p-10 text-center">
                    <icons.Activity className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No security events recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/50">
                    {securityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                              log.severity === 'critical' || log.severity === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : log.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {log.severity === 'critical' || log.severity === 'high' ? (
                              <icons.ShieldAlert className="w-3.5 h-3.5" />
                            ) : log.severity === 'medium' ? (
                              <icons.Lock className="w-3.5 h-3.5" />
                            ) : (
                              <icons.Activity className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-sm font-medium">
                              {log.action}
                            </p>
                            <p className="text-slate-400 text-[11px] mt-0.5 font-mono truncate">
                              <span className="text-slate-300">{log.admin}</span>
                              {' - '}
                              {log.target}
                            </p>
                            <p className="text-slate-500 text-[10px] mt-1 flex items-center gap-1">
                              <icons.Clock className="w-2.5 h-2.5" />
                              {log.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-800/30 border-t border-slate-800 text-center">
                <Link
                  href="/admin/security-logs"
                  className="text-[10px] text-slate-400 hover:text-white transition-colors uppercase font-bold tracking-wider"
                >
                  View Full Audit Log
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION 4: ANALYTICS QUICK ENTRY CARD */}
          <div className="bg-gradient-to-r from-[#004063] to-[#029bba] rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
                <icons.TrendingUp className="w-5 h-5 text-[#10b981]" />
                Lead Funnel &amp; AI Intelligence Analytics Dashboard
              </h2>
              <p className="text-xs text-white/80">
                View detailed pipeline attribution, ALEEM AI conversion metrics, SLA response times, and growth charts.
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="px-5 py-3 bg-white text-[#004063] font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors shadow flex items-center gap-2 shrink-0"
            >
              Open Full Dashboard
              <icons.ArrowRight className="w-4 h-4 text-[#029bba]" />
            </Link>
          </div>

        </div>
      </AdminLayout>
    </>
  );
}