// pages/admin/analytics/index.tsx
// Highrise.pk — Enterprise Lead Funnel & ALEEM AI Telemetry Analytics Dashboard
// Real-time Pipeline, Source Attribution, SLA Tracking, AI Performance & Satisfaction Feedback
// NO generic Card imports | Recharts strictly formatted | Primary #029bba & #004063 palette

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  TrendingUp,
  Bot,
  Users,
  Clock,
  ShieldCheck,
  RefreshCw,
  Loader2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Zap,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

interface FunnelStage {
  _id: string;
  count: number;
}

interface SourceItem {
  _id: string;
  count: number;
}

interface DailyVolumeSeries {
  _id: string;
  chats: number;
  searches: number;
}

interface TimeSeriesItem {
  _id: string;
  leadsCount: number;
  wonCount: number;
  wonValue: number;
}

interface FeedbackReasonItem {
  _id: string;
  count: number;
}

interface AnalyticsApiResponse {
  success: boolean;
  range: TimeRange;
  meta: {
    startDate: string;
    generatedAt: string;
  };
  summary: {
    totalLeads: number;
    totalWon: number;
    totalLost: number;
    winRatePct: number;
    totalPipelineValue: number;
    avgLeadScore: number;
    avgFirstResponseTimeMin: number;
    unansweredLeads: number;
  };
  aleemTelemetry: {
    totalChats: number;
    groundedSearches: number;
    leadsGeneratedFromChat: number;
    aleemConversionRatePct: number;
    botAttemptsBlocked: number;
    quotaExceededEvents: number;
    providerFailures: number;
    dailyVolumeSeries: DailyVolumeSeries[];
    feedback?: {
      totalFeedback: number;
      positiveCount: number;
      negativeCount: number;
      helpfulPct: number;
      topReasons: FeedbackReasonItem[];
    };
  };
  funnelBreakdown: {
    byStatus: FunnelStage[];
    bySource: SourceItem[];
    byLeadType: SourceItem[];
    byEntityType: SourceItem[];
  };
  timeSeries: TimeSeriesItem[];
  error?: string;
}

const BRAND_COLORS = {
  primary: '#029bba',
  secondary: '#004063',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  purple: '#7c3aed',
  cyan: '#06b6d4',
  slate: '#64748b',
};

const PIE_COLORS = ['#029bba', '#004063', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4'];

function formatPKRCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `PKR ${(amount / 10000000).toFixed(2)} Crore`;
  }
  if (amount >= 100000) {
    return `PKR ${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

const REASON_MAP: Record<string, string> = {
  price_mismatch: 'Price Mismatch',
  not_relevant: 'Not Relevant',
  unverified_alert: 'Unverified / Risky',
  language_issue: 'Language / Script',
  other: 'Other Reason',
};

export default function AdminAnalyticsDashboard(): React.ReactElement {
  const [range, setRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = useCallback(async (selectedRange: TimeRange) => {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/analytics/lead-funnel?range=${selectedRange}`, {
        credentials: 'include',
      });
      const result = (await res.json()) as AnalyticsApiResponse;

      if (!res.ok || !result.success) {
        setErrorMsg(result.error ?? 'Failed to load analytics data.');
        return;
      }

      setData(result);
    } catch {
      setErrorMsg('Network error while connecting to analytics service.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchAnalytics(range).finally(() => setLoading(false));
  }, [range, fetchAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics(range);
    setRefreshing(false);
  };

  return (
    <>
      <Head>
        <title>Lead & AI Analytics | Admin | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6 pb-12">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#029bba]/10 text-[#029bba] rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black text-[#004063]">
                  Lead Funnel &amp; AI Intelligence Analytics
                </h1>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Real-time attribution, pipeline progression, SLA metrics, and ALEEM AI tuning feedback.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      range === r
                        ? 'bg-white text-[#004063] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:border-[#029bba] hover:text-[#029bba] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-3 p-4 border-l-4 border-[#ef4444] bg-red-50 rounded-r-xl">
              <ShieldAlert className="w-5 h-5 text-[#ef4444] flex-shrink-0" />
              <p className="text-sm font-semibold text-red-800">{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-3" />
              <p className="text-sm font-semibold text-[#004063]">
                Aggregating real-time pipeline &amp; AI metrics...
              </p>
            </div>
          ) : data ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Total Leads</span>
                    <Users className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <p className="text-3xl font-black text-[#004063]">{data.summary.totalLeads.toLocaleString()}</p>
                  <p className="text-xs text-[#10b981] font-semibold mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {data.summary.winRatePct}% Win Rate
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Won Revenue</span>
                    <DollarSign className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <p className="text-xl font-black text-[#004063] truncate">
                    {formatPKRCurrency(data.summary.totalPipelineValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.summary.totalWon} closed won leads
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">ALEEM Conversion</span>
                    <Bot className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <p className="text-3xl font-black text-[#029bba]">
                    {data.aleemTelemetry.aleemConversionRatePct}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.aleemTelemetry.leadsGeneratedFromChat} leads from {data.aleemTelemetry.totalChats} chats
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">First Response SLA</span>
                    <Clock className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <p className="text-3xl font-black text-[#004063]">
                    {data.summary.avgFirstResponseTimeMin} <span className="text-xs font-medium text-gray-500">min</span>
                  </p>
                  <p className="text-xs text-red-500 font-semibold mt-1">
                    {data.summary.unansweredLeads} pending response
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Bot Attacks Shielded</span>
                    <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <p className="text-3xl font-black text-[#10b981]">
                    {data.aleemTelemetry.botAttemptsBlocked}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Honeypot &amp; velocity traps
                  </p>
                </div>

              </div>

              {/* Main Charts Grid */}
              <div className="grid lg:grid-cols-2 gap-6">

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#004063] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#029bba]" />
                        Lead Pipeline Stage Progression
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">Distribution of active leads across sales stages</p>
                    </div>
                  </div>

                  {mounted && data.funnelBreakdown.byStatus.length > 0 ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.funnelBreakdown.byStatus}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                          <YAxis
                            dataKey="_id"
                            type="category"
                            stroke="#64748b"
                            fontSize={11}
                            tickFormatter={(v) => String(v).replace('_', ' ').toUpperCase()}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#004063', borderRadius: '12px', color: '#fff', border: 'none' }}
                          />
                          <Bar dataKey="count" fill={BRAND_COLORS.primary} radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                      No funnel data for this timeframe.
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#004063] flex items-center gap-2">
                        <PieIcon className="w-4 h-4 text-[#7c3aed]" />
                        Source Attribution &amp; Channels
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">Where leads are coming from (Chat vs Page vs Direct)</p>
                    </div>
                  </div>

                  {mounted && data.funnelBreakdown.bySource.length > 0 ? (
                    <div className="h-72 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.funnelBreakdown.bySource}
                            dataKey="count"
                            nameKey="_id"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={50}
                            paddingAngle={4}
                            label={({ name, percent }) => {
                              const pct = typeof percent === 'number' ? (percent * 100).toFixed(0) : '0';
                              return `${String(name ?? '').replace(/_/g, ' ')} (${pct}%)`;
                            }}
                          >
                            {data.funnelBreakdown.bySource.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#004063', borderRadius: '12px', color: '#fff', border: 'none' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                      No attribution data available.
                    </div>
                  )}
                </div>

              </div>

              {/* STAGE 0.1 NEW: ALEEM AI Satisfaction & User Tuning Card */}
              {data.aleemTelemetry.feedback && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#004063] flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-[#10b981]" />
                        ALEEM AI Satisfaction &amp; Response Tuning
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">User ratings and negative feedback breakdown</p>
                    </div>
                    <span className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] font-bold text-xs rounded-full">
                      {data.aleemTelemetry.feedback.helpfulPct}% Helpful Rate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Feedback Gauge Metrics */}
                    <div className="flex flex-col justify-center bg-[#f0f9ff] p-5 rounded-xl border border-[#029bba]/20">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Feedback Volume</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[#004063]">
                          {data.aleemTelemetry.feedback.totalFeedback}
                        </span>
                        <span className="text-xs text-gray-500">total ratings</span>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-[#10b981]">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {data.aleemTelemetry.feedback.positiveCount} helpful
                        </span>
                        <span className="flex items-center gap-1 text-[#ef4444]">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {data.aleemTelemetry.feedback.negativeCount} issues
                        </span>
                      </div>
                    </div>

                    {/* Top Negative Reasons Breakdown */}
                    <div className="md:col-span-2 bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <p className="text-xs font-bold text-[#004063] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#ef4444]" />
                        Top Reported Negative Reasons
                      </p>

                      {data.aleemTelemetry.feedback.topReasons.length > 0 ? (
                        <div className="space-y-2.5">
                          {data.aleemTelemetry.feedback.topReasons.map((item) => {
                            const totalNeg = data.aleemTelemetry.feedback?.negativeCount || 1;
                            const pct = Math.round((item.count / totalNeg) * 100);
                            const label = REASON_MAP[item._id] || item._id;

                            return (
                              <div key={item._id} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-700">
                                  <span>{label}</span>
                                  <span>{item.count} reports ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-[#ef4444] h-full rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 py-4 text-center">
                          No negative feedback reported in this timeframe. Excellent accuracy! 🎉
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Series Trends */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#004063] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#10b981]" />
                      Lead Acquisition &amp; Conversion Growth Trend
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Total incoming leads vs closed won deals over time</p>
                  </div>
                </div>

                {mounted && data.timeSeries.length > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={BRAND_COLORS.primary} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={BRAND_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={BRAND_COLORS.success} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={BRAND_COLORS.success} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="_id" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#004063', borderRadius: '12px', color: '#fff', border: 'none' }}
                        />
                        <Area type="monotone" dataKey="leadsCount" name="Total Leads" stroke={BRAND_COLORS.primary} fillOpacity={1} fill="url(#colorLeads)" />
                        <Area type="monotone" dataKey="wonCount" name="Won Deals" stroke={BRAND_COLORS.success} fillOpacity={1} fill="url(#colorWon)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                    No time series data available for this range.
                  </div>
                )}
              </div>

              {/* Health Monitor */}
              <div className="bg-[#004063] text-white rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#029bba]/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#029bba]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">ALEEM AI Engine &amp; Security Health Monitor</h3>
                      <p className="text-xs text-white/70">System health, grounded search frequency, and bot protection</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 rounded-full text-xs font-bold">
                    System Operational
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-white/60 font-medium">Total AI Chats</p>
                    <p className="text-2xl font-black mt-1 text-[#029bba]">{data.aleemTelemetry.totalChats}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-white/60 font-medium">Grounded Search Hits</p>
                    <p className="text-2xl font-black mt-1 text-[#10b981]">{data.aleemTelemetry.groundedSearches}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-white/60 font-medium">Bot Traps Triggered</p>
                    <p className="text-2xl font-black mt-1 text-[#f59e0b]">{data.aleemTelemetry.botAttemptsBlocked}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-white/60 font-medium">Provider Failures</p>
                    <p className="text-2xl font-black mt-1 text-white">{data.aleemTelemetry.providerFailures}</p>
                  </div>
                </div>
              </div>

            </>
          ) : null}

        </div>
      </AdminLayout>
    </>
  );
}