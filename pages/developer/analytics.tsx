// FILE: pages/developer/analytics.tsx

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import {
  Loader2,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Flame,
  PhoneCall,
  Target,
  CalendarCheck,
  FileText,
  MessageSquare,
  BarChart3,
  Activity,
  Mail,
  Clock,
  Building2,
  MapPin,
  Globe,
} from 'lucide-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LeadStats {
  all: number;
  new: number;
  contacted: number;
  qualified: number;
  site_visit_scheduled: number;
  proposal_sent: number;
  negotiation: number;
  won: number;
  lost: number;
  nurture: number;
  priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  avgScore: number;
  conversionRate: number;
  totalRevenue: number;
}

interface EmailStats {
  totalSent: number;
  lastSentAt: string | null;
}

interface ProjectStat {
  name: string;
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  revenue: number;
  city: string;
}

interface SourceStat {
  name: string;
  value: number;
}

interface AnalyticsApiResponse {
  success: boolean;
  message?: string;
  stats?: LeadStats;
  emailStats?: EmailStats;
  projectStats?: ProjectStat[];
  sourceStats?: SourceStat[];
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_LEAD_STATS: LeadStats = {
  all: 0,
  new: 0,
  contacted: 0,
  qualified: 0,
  site_visit_scheduled: 0,
  proposal_sent: 0,
  negotiation: 0,
  won: 0,
  lost: 0,
  nurture: 0,
  priority: { low: 0, medium: 0, high: 0, urgent: 0 },
  avgScore: 0,
  conversionRate: 0,
  totalRevenue: 0,
};

// ─── Metric card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  iconBg: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, iconBg, icon }: MetricCardProps): React.ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-[#666666] uppercase font-semibold tracking-wide">
            {label}
          </p>
          <p className="text-xl font-bold text-[#004063]">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AnalyticsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6" aria-label="Loading analytics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-2 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-5 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 h-64 animate-pulse" />
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-28 animate-pulse" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-32 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function DeveloperAnalyticsContent(): React.ReactElement {
  const [stats, setStats] = useState<LeadStats>(DEFAULT_LEAD_STATS);
  const [emailStats, setEmailStats] = useState<EmailStats>({ totalSent: 0, lastSentAt: null });
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (showRefresh = false): Promise<void> => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setAnalyticsError(null);

    try {
      const res = await fetch('/api/developer/analytics', {
        credentials: 'include',
      });

      const data = (await res.json()) as AnalyticsApiResponse;

      if (!res.ok || !data.success) {
        setAnalyticsError(data.message ?? 'Failed to load analytics. Please try again.');
        return;
      }

      if (data.stats) setStats(data.stats);
      if (data.emailStats) setEmailStats(data.emailStats);
      if (data.projectStats) setProjectStats(data.projectStats);
      if (data.sourceStats) setSourceStats(data.sourceStats);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      setAnalyticsError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const statusBreakdown = [
    { key: 'new',                   label: 'New',             value: stats.new,                   color: 'bg-blue-500',   icon: <Flame className="w-4 h-4" /> },
    { key: 'contacted',             label: 'Contacted',       value: stats.contacted,              color: 'bg-purple-500', icon: <PhoneCall className="w-4 h-4" /> },
    { key: 'qualified',             label: 'Qualified',       value: stats.qualified,              color: 'bg-orange-500', icon: <Target className="w-4 h-4" /> },
    { key: 'site_visit_scheduled',  label: 'Visit Scheduled', value: stats.site_visit_scheduled,   color: 'bg-indigo-500', icon: <CalendarCheck className="w-4 h-4" /> },
    { key: 'proposal_sent',         label: 'Proposal Sent',   value: stats.proposal_sent,          color: 'bg-cyan-500',   icon: <FileText className="w-4 h-4" /> },
    { key: 'negotiation',           label: 'Negotiation',     value: stats.negotiation,            color: 'bg-yellow-500', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'won',                   label: 'Won',             value: stats.won,                   color: 'bg-green-500',  icon: <CheckCircle2 className="w-4 h-4" /> },
    { key: 'lost',                  label: 'Lost',            value: stats.lost,                  color: 'bg-red-500',    icon: <XCircle className="w-4 h-4" /> },
    { key: 'nurture',               label: 'Nurture',         value: stats.nurture,               color: 'bg-gray-400',   icon: <Activity className="w-4 h-4" /> },
  ];

  const maxStatusValue = statusBreakdown.length > 0
    ? Math.max(...statusBreakdown.map((s) => s.value))
    : 1;

  const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f9fa]">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#004063]">Project Intelligence</h1>
            <p className="text-[#666666] text-sm">
              Deep dive into your projects, lead sources, and team performance.
            </p>
          </div>
          <button
            onClick={() => void fetchAnalytics(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#333333] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing
              ? <Loader2 className="w-4 h-4 animate-spin text-[#666666]" />
              : <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            }
            <span>{refreshing ? 'Analyzing...' : 'Refresh Insights'}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Error banner */}
        {analyticsError && (
          <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#ef4444]">Failed to load analytics</p>
              <p className="text-sm text-[#333333] mt-1">{analyticsError}</p>
            </div>
            <button
              onClick={() => void fetchAnalytics(true)}
              className="text-sm font-semibold text-[#029bba] hover:underline whitespace-nowrap"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            {/* ── Top metrics ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <MetricCard
                label="Total Leads"
                value={stats.all}
                iconBg="bg-[#029bba]/10"
                icon={<Users className="w-5 h-5 text-[#029bba]" />}
              />
              <MetricCard
                label="New Interest"
                value={stats.new}
                iconBg="bg-blue-100"
                icon={<Flame className="w-5 h-5 text-blue-600" />}
              />
              <MetricCard
                label="Deals Closed"
                value={stats.won}
                iconBg="bg-[#10b981]/10"
                icon={<CheckCircle2 className="w-5 h-5 text-[#10b981]" />}
              />
              <MetricCard
                label="Success Rate"
                value={`${stats.conversionRate}%`}
                iconBg="bg-purple-100"
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              />
              <MetricCard
                label="Emails Sent"
                value={emailStats.totalSent}
                iconBg="bg-indigo-100"
                icon={<Mail className="w-5 h-5 text-indigo-600" />}
              />
              <MetricCard
                label="Last Activity"
                value={formatDate(emailStats.lastSentAt)}
                iconBg="bg-orange-100"
                icon={<Clock className="w-5 h-5 text-orange-500" />}
              />
            </div>

            {/* ── Main grid ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Project performance table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2 flex flex-col">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-[#004063] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#029bba]" />
                    Top Performing Projects
                  </h2>
                  <p className="text-xs text-[#666666] mt-1">
                    Which projects are generating the most interest?
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#666666] uppercase bg-[#f8f9fa]">
                      <tr>
                        <th className="px-5 py-3 font-medium">Project Name</th>
                        <th className="px-5 py-3 font-medium">Location</th>
                        <th className="px-5 py-3 font-medium text-center">Total</th>
                        <th className="px-5 py-3 font-medium text-center">New</th>
                        <th className="px-5 py-3 font-medium text-center">Won</th>
                        <th className="px-5 py-3 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projectStats.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-[#666666] text-sm">
                            No project data available yet.
                          </td>
                        </tr>
                      ) : (
                        projectStats.map((proj, idx) => (
                          <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                            <td className="px-5 py-3 font-medium text-[#333333]">{proj.name}</td>
                            <td className="px-5 py-3 text-[#666666]">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {proj.city}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                                {proj.totalLeads}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center text-[#666666]">{proj.newLeads}</td>
                            <td className="px-5 py-3 text-center text-[#10b981] font-medium">{proj.wonLeads}</td>
                            <td className="px-5 py-3 text-right text-[#333333] font-medium">
                              {proj.revenue > 0
                                ? `PKR ${proj.revenue.toLocaleString()}`
                                : <span className="text-[#666666]">—</span>
                              }
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">

                {/* Lead sources */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h2 className="text-sm font-semibold text-[#004063] flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-[#029bba]" />
                    Lead Sources
                  </h2>
                  {sourceStats.length === 0 ? (
                    <p className="text-xs text-[#666666] text-center py-4">No source data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {sourceStats.map((src, idx) => {
                        const total = stats.all > 0 ? stats.all : 1;
                        const percent = Math.round((src.value / total) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#333333] capitalize font-medium">
                                {src.name.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[#666666]">{percent}% ({src.value})</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              {/* NOTE: dynamic computed width — permitted inline style exception */}
                              <div
                                className="bg-[#029bba] h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Funnel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h2 className="text-sm font-semibold text-[#004063] flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-[#029bba]" />
                    Pipeline Funnel
                  </h2>
                  {statusBreakdown.every((s) => s.value === 0) ? (
                    <p className="text-xs text-[#666666] text-center py-4">No pipeline data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {statusBreakdown.slice(0, 5).map((item) => {
                        const percentage = maxStatusValue > 0
                          ? Math.max((item.value / maxStatusValue) * 100, item.value > 0 ? 8 : 0)
                          : 0;
                        return (
                          <div key={item.key} className="flex items-center gap-2 text-xs">
                            <span className="w-24 text-[#666666] truncate shrink-0">{item.label}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                              {/* NOTE: dynamic computed width — permitted inline style exception */}
                              <div
                                className={`h-full ${item.color} rounded-full flex items-center justify-end px-2 text-white font-semibold transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              >
                                {item.value > 0 ? item.value : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function DeveloperAnalyticsPage(): React.ReactElement {
  return (
    <DeveloperLayout>
      <Head>
        <title>Analytics — Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <DeveloperAnalyticsContent />
    </DeveloperLayout>
  );
}