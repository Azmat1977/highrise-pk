// pages/admin/index.tsx
// Highrise.pk — Admin Dashboard Homepage
// Stats overview + developer performance audit + security feed
// V2: framer-motion + ui/Card removed | console.* removed | mock data removed
// Society stats added | API type alignment fixed
// NO framer-motion | NO ui/Card | NO mock data | NO console.*

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Mail,
  Clock,
  Zap,
  UserX,
  Activity,
  ShieldAlert,
  Lock,
  MapPin,
  AlertTriangle,
  BadgeCheck,
  RefreshCw,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types (mirror api/admin/stats.ts response shape) ────────────────────────

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
    users: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      banned: number;
      trash: number;
    };
    emails: {
      total: number;
      sent: number;
      failed: number;
      pending: number;
    };
  };
  performance?: DeveloperPerformance[];
  logs?: SecurityLogEntry[];
  message?: string;
}

interface DashboardStats {
  properties: number;
  users: number;
  developers: number;
  agents: number;
  societies: number;
  inquiries: number;
  unpublishedSocieties: number;
  activeAlerts: number;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardConfig {
  title: string;
  value: number;
  subValue?: string;
  icon: React.ReactElement;
  color: string;
  bgColor: string;
  href: string;
}

interface StatCardProps {
  config: StatCardConfig;
  loading: boolean;
}

function StatCard({ config, loading }: StatCardProps): React.ReactElement {
  return (
    <Link href={config.href}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all duration-200 p-5 cursor-pointer group h-full">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            {config.icon}
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] transition-colors" />
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats>({
    properties: 0,
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

  // ── Fetch dashboard data ──────────────────────────────────────────────────

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
        properties: data.stats.totalProperties,
        users: data.stats.totalUsers,
        developers: data.stats.verifiedDevelopers,
        agents: data.stats.verifiedAgents,
        societies: data.stats.verifiedSocieties,
        inquiries: data.stats.activeInquiries,
        unpublishedSocieties: data.stats.societiesUnpublished,
        activeAlerts: data.stats.societyAlertsActive,
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

  // ── Stat cards configuration ──────────────────────────────────────────────

  const statCards: StatCardConfig[] = [
    {
      title: 'Total Properties',
      value: stats.properties,
      icon: <Building2 className="w-5 h-5" />,
      color: '#029bba',
      bgColor: '#029bba15',
      href: '/admin/properties',
    },
    {
      title: 'Total Users',
      value: stats.users,
      icon: <Users className="w-5 h-5" />,
      color: '#10b981',
      bgColor: '#10b98115',
      href: '/admin/users',
    },
    {
      title: 'Verified Developers',
      value: stats.developers,
      icon: <BadgeCheck className="w-5 h-5" />,
      color: '#3b82f6',
      bgColor: '#3b82f615',
      href: '/admin/developers?status=approved',
    },
    {
      title: 'Verified Agents',
      value: stats.agents,
      icon: <Users className="w-5 h-5" />,
      color: '#06b6d4',
      bgColor: '#06b6d415',
      href: '/admin/agents?status=approved',
    },
    {
      title: 'Verified Societies',
      value: stats.societies,
      subValue: stats.unpublishedSocieties > 0 ? `${stats.unpublishedSocieties} unpublished` : undefined,
      icon: <MapPin className="w-5 h-5" />,
      color: '#7c3aed',
      bgColor: '#7c3aed15',
      href: '/admin/societies',
    },
    {
      title: 'Active Inquiries',
      value: stats.inquiries,
      icon: <Mail className="w-5 h-5" />,
      color: '#f59e0b',
      bgColor: '#f59e0b15',
      href: '/admin/inquiries',
    },
    {
      title: 'Society Alerts',
      value: stats.activeAlerts,
      subValue: stats.activeAlerts > 0 ? 'Active risk alerts' : 'All clear',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: '#ef4444',
      bgColor: '#ef444415',
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

          {/* ── Page Header ── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-sm">
                Welcome back. Real-time platform overview.
              </p>
            </div>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:border-[#029bba] hover:text-[#029bba] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* ── Error Banner ── */}
          {errorMsg && (
            <div className="flex items-center gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* ── Stats Grid (7 cards) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <StatCard key={card.title} config={card} loading={loading} />
            ))}
          </div>

          {/* ── Intelligence Grid ── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Developer Performance Audit */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#029bba]" />
                    Developer Performance Audit
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Lead response & negligence tracking
                  </p>
                </div>
                <Link href="/admin/developers?status=approved">
                  <button className="text-xs text-[#029bba] font-semibold hover:underline flex items-center gap-1">
                    View All
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>

              {loading ? (
                <div className="p-10 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
                </div>
              ) : devPerformance.length === 0 ? (
                <div className="p-10 text-center">
                  <BadgeCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
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
                                      ? 'bg-green-500'
                                      : dev.responseRate > 50
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${dev.responseRate}%` }}
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
                                <UserX className="w-3 h-3" />
                                {dev.ignoredLeads}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
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
                              <span className="inline-flex text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
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

            {/* Security Feed */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Security Feed
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                    Live
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {loading ? (
                  <div className="p-10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                  </div>
                ) : securityLogs.length === 0 ? (
                  <div className="p-10 text-center">
                    <Activity className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No security events yet.</p>
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
                            className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                              log.severity === 'critical' || log.severity === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : log.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {log.severity === 'critical' || log.severity === 'high' ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : log.severity === 'medium' ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Activity className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-sm font-medium">
                              {log.action}
                            </p>
                            <p className="text-slate-400 text-[11px] mt-0.5 font-mono truncate">
                              <span className="text-slate-300">{log.admin}</span>
                              {' · '}
                              {log.target}
                            </p>
                            <p className="text-slate-500 text-[10px] mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
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
                  View Full Audit Log →
                </Link>
              </div>
            </div>
          </div>

          {/* ── Charts (placeholder until analytics API is live) ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Growth Analytics</h2>
                  <p className="text-xs text-gray-500">
                    Connect analytics endpoint to display real-time trends
                  </p>
                </div>
              </div>
              <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <TrendingUp className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">Analytics endpoint coming soon</p>
                <p className="text-xs text-gray-400 mt-1">
                  /api/admin/analytics/growth (Section 9)
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Market Demand</h2>
                  <p className="text-xs text-gray-500">
                    City-level supply &amp; demand metrics
                  </p>
                </div>
              </div>
              <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Activity className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">Market data coming soon</p>
                <p className="text-xs text-gray-400 mt-1">
                  /api/admin/analytics/market (Section 9)
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}