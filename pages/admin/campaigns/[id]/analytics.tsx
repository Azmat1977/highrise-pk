// pages/admin/campaigns/[id]/analytics.tsx
// 📊 CAMPAIGN ANALYTICS DASHBOARD — HIGHRISE.PK
// Full analytics for a sent campaign

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Eye,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  BarChart2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

interface ABVariantStats {
  sent:      number;
  opened:    number;
  clicked:   number;
  openRate:  number;
  clickRate: number;
}

interface AnalyticsData {
  campaign: {
    _id:             string;
    title:           string;
    subject:         string;
    status:          string;
    sentAt:          string | null;
    template:        string;
    recipientSource: string;
    abTest?:         any;
  };
  abTest: {
    enabled:           boolean;
    variantASubject:   string;
    variantBSubject:   string;
    splitPercent:      number;
    winnerMetric:      string;
    winner:            'a' | 'b' | null;
    winnerPickedAt:    string | null;
    status:            string;
    testDurationHours: number;
    variantA:          ABVariantStats;
    variantB:          ABVariantStats;
  } | null;
  metrics: {
    totalSent:        number;
    totalOpened:      number;
    totalClicked:     number;
    totalBounced:     number;
    totalUnsubscribed:number;
    totalOpenCount:   number;
    totalClickCount:  number;
    openRate:         number;
    clickRate:        number;
    bounceRate:       number;
    ctoRate:          number;
  };
  byType: {
    subscribers: { sent: number; opened: number; clicked: number; openRate: number };
    leads:       { sent: number; opened: number; clicked: number; openRate: number };
  };
  timeline: Array<{ date: string; opens: number; clicks: number }>;
  topUrls:  Array<{ url: string; totalClicks: number; uniqueClickers: number }>;
  recentOpeners: Array<{
    email:          string;
    name:           string;
    recipientType:  string;
    openCount:      number;
    clickCount:     number;
    firstOpenedAt:  string;
    lastOpenedAt:   string;
    firstClickedAt: string | null;
  }>;
  nonOpeners: Array<{
    email:         string;
    name:          string;
    recipientType: string;
    sentAt:        string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    day:   'numeric',
    month: 'short',
  });
}

function truncateUrl(url: string, max = 55): string {
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + parsed.pathname + (parsed.search || '');
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

// ─── Metric Card ──────────────────────────────────────────────

const MetricCard: React.FC<{
  label:      string;
  value:      string | number;
  sub?:       string;
  icon:       React.ReactNode;
  color:      string;
  bgColor:    string;
  trend?:     'up' | 'down' | 'neutral';
  benchmark?: string;
}> = ({ label, value, sub, icon, color, bgColor, trend, benchmark }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center`}>
        <span className={color}>{icon}</span>
      </div>
      {trend && (
        <span className={`flex items-center gap-0.5 text-xs font-bold ${
          trend === 'up'   ? 'text-emerald-600' :
          trend === 'down' ? 'text-red-500'     : 'text-gray-500'
        }`}>
          {trend === 'up'   ? <TrendingUp   className="w-3.5 h-3.5" /> :
           trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
        </span>
      )}
    </div>
    <p className="text-3xl font-black text-[#004063] mb-0.5">{value}</p>
    <p className="text-sm font-semibold text-gray-600">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    {benchmark && (
      <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
        {benchmark}
      </p>
    )}
  </div>
);

// ─── Simple Bar Chart (Pure Tailwind — no dependencies) ───────

const MiniBarChart: React.FC<{
  data:   Array<{ date: string; opens: number; clicks: number }>;
  height: number;
}> = ({ data, height }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm py-8">
        No timeline data yet
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.opens, d.clicks)), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 min-w-max pb-2" style={{ height }}>
        {data.map((d, i) => {
          const openH  = Math.max(4, Math.round((d.opens  / maxValue) * (height - 32)));
          const clickH = Math.max(4, Math.round((d.clicks / maxValue) * (height - 32)));
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
                              bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg 
                              whitespace-nowrap opacity-0 group-hover:opacity-100 
                              transition-opacity z-10 pointer-events-none">
                {formatDateShort(d.date)}<br/>
                Opens: {d.opens} · Clicks: {d.clicks}
              </div>
              <div className="flex items-end gap-0.5">
                <div
                  className="w-5 bg-[#029bba] rounded-t-sm transition-all"
                  style={{ height: openH }}
                  title={`${d.opens} opens`}
                />
                <div
                  className="w-5 bg-emerald-400 rounded-t-sm transition-all"
                  style={{ height: clickH }}
                  title={`${d.clicks} clicks`}
                />
              </div>
              <span className="text-[9px] text-gray-400 mt-1 rotate-45 origin-left">
                {formatDateShort(d.date)}
              </span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#029bba] rounded-sm" />
          <span className="text-xs text-gray-500 font-semibold">Opens</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
          <span className="text-xs text-gray-500 font-semibold">Clicks</span>
        </div>
      </div>
    </div>
  );
};

// ─── A/B Test Results Section ─────────────────────────────────

const ABTestResultsSection: React.FC<{
  abTest:          NonNullable<AnalyticsData['abTest']>;
  campaignId:      string;
  onWinnerPicked:  () => void;
}> = ({ abTest, campaignId, onWinnerPicked }) => {
  const [picking,  setPicking]  = useState(false);
  const [pickError, setPickError] = useState('');

  const pickWinner = async (winner: 'a' | 'b' | 'auto') => {
    setPicking(true);
    setPickError('');
    try {
      const res  = await fetch(`/api/newsletter/campaigns/${campaignId}/ab-winner`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ winner }),
      });
      const data = await res.json();
      if (data.success) {
        onWinnerPicked();
      } else {
        setPickError(data.message || 'Failed to pick winner');
      }
    } catch {
      setPickError('Network error — please try again');
    } finally {
      setPicking(false);
    }
  };

  const isWinnerPicked = !!abTest.winner;
  const aIsWinner = abTest.winner === 'a';
  const bIsWinner = abTest.winner === 'b';

  const metricLabel = abTest.winnerMetric === 'click_rate' ? 'Click Rate' : 'Open Rate';
  const aMetric     = abTest.winnerMetric === 'click_rate' ? abTest.variantA.clickRate : abTest.variantA.openRate;
  const bMetric     = abTest.winnerMetric === 'click_rate' ? abTest.variantB.clickRate : abTest.variantB.openRate;

  return (
    <div className="bg-white rounded-2xl border border-purple-200 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-base font-black text-[#004063] flex items-center gap-2">
          <span className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-black">A/B</span>
          </span>
          A/B Test Results
          {isWinnerPicked && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 
                             rounded-full font-bold">
              Winner Picked
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Metric: <strong>{metricLabel}</strong></span>
          <span>·</span>
          <span>Duration: <strong>{abTest.testDurationHours}h</strong></span>
        </div>
      </div>

      {/* Variant comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {(
          [
            {
              label:   'A',
              subject: abTest.variantASubject,
              stats:   abTest.variantA,
              metric:  aMetric,
              isWinner: aIsWinner,
              color:   '#029bba',
              bg:      'bg-[#029bba]/10',
              border:  aIsWinner ? 'border-emerald-400 ring-2 ring-emerald-300' : 'border-gray-200',
            },
            {
              label:   'B',
              subject: abTest.variantBSubject,
              stats:   abTest.variantB,
              metric:  bMetric,
              isWinner: bIsWinner,
              color:   '#7c3aed',
              bg:      'bg-purple-100',
              border:  bIsWinner ? 'border-emerald-400 ring-2 ring-emerald-300' : 'border-gray-200',
            },
          ] as const
        ).map((v) => (
          <div
            key={v.label}
            className={`rounded-xl border p-4 transition-all relative ${v.border}`}
          >
            {/* Winner crown */}
            {v.isWinner && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 
                              bg-emerald-500 text-white text-[10px] font-black 
                              px-3 py-0.5 rounded-full">
                🏆 WINNER
              </div>
            )}

            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center 
                            text-white text-xs font-black flex-shrink-0`}
                style={{ backgroundColor: v.color }}
              >
                {v.label}
              </span>
              <p className="text-sm font-bold text-gray-800 line-clamp-2">
                {v.subject}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sent',    value: v.stats.sent.toLocaleString() },
                { label: 'Opened',  value: v.stats.opened.toLocaleString() },
                { label: 'Clicked', value: v.stats.clicked.toLocaleString() },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-base font-black text-[#004063]">{s.value}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Key metric (winner metric) */}
            <div className={`mt-3 pt-3 border-t border-gray-100 text-center`}>
              <p
                className="text-2xl font-black"
                style={{ color: v.color }}
              >
                {v.metric}%
              </p>
              <p className="text-xs text-gray-500 font-semibold">{metricLabel}</p>
            </div>

            {/* Manual pick button (only if no winner yet) */}
            {!isWinnerPicked && (
              <button
                type="button"
                onClick={() => pickWinner(v.label.toLowerCase() as 'a' | 'b')}
                disabled={picking}
                className="mt-3 w-full py-2 rounded-xl border border-gray-200 
                           text-xs font-bold text-gray-600 hover:bg-gray-50 
                           transition-colors disabled:opacity-50"
              >
                Pick {v.label} as Winner
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Auto-pick button */}
      {!isWinnerPicked && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => pickWinner('auto')}
            disabled={picking}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 
                       text-white rounded-xl font-bold text-sm 
                       hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {picking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '🤖'
            )}
            Auto-Pick Winner by {metricLabel}
          </button>
          {pickError && (
            <p className="text-xs text-red-500 font-semibold">{pickError}</p>
          )}
          <p className="text-xs text-gray-400">
            Automatically selects the variant with the higher {metricLabel.toLowerCase()}
          </p>
        </div>
      )}

      {/* Winner declared */}
      {isWinnerPicked && abTest.winnerPickedAt && (
        <div className="flex items-center justify-center gap-2 p-3 
                        bg-emerald-50 rounded-xl border border-emerald-200 mt-2">
          <span className="text-sm font-black text-emerald-700">
            🏆 Variant {abTest.winner?.toUpperCase()} won by {metricLabel}
          </span>
          <span className="text-xs text-emerald-600">
            · Picked {formatDate(abTest.winnerPickedAt)}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────

export default function CampaignAnalyticsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status: sessionStatus } = useSession();

  const [data,       setData]       = useState<AnalyticsData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Table expand/collapse
  const [showAllOpeners,    setShowAllOpeners]    = useState(false);
  const [showAllNonOpeners, setShowAllNonOpeners] = useState(false);
  const [showAllUrls,       setShowAllUrls]       = useState(false);

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    const role = (session.user as any)?.role;
    if (role !== 'admin') router.replace('/');
  }, [session, sessionStatus, router]);

  // ── Fetch analytics ───────────────────────────────────────
  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (!id || typeof id !== 'string') return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res  = await fetch(`/api/newsletter/campaigns/${id}/analytics`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || 'Failed to load analytics');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && id) {
      fetchAnalytics();
    }
  }, [id, sessionStatus, fetchAnalytics]);

  // ── Loading state ─────────────────────────────────────────
  if (sessionStatus === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-[#004063] mb-2">
              Could not load analytics
            </h2>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => fetchAnalytics()}
                className="px-4 py-2 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/admin/campaigns"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Back to Campaigns
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { campaign, metrics, byType, timeline, topUrls, recentOpeners, nonOpeners } = data;

  // Industry benchmarks (real estate email)
  const openRateTrend  = metrics.openRate  >= 25 ? 'up' : metrics.openRate  >= 15 ? 'neutral' : 'down';
  const clickRateTrend = metrics.clickRate >= 3  ? 'up' : metrics.clickRate >= 1  ? 'neutral' : 'down';

  const displayedOpeners    = showAllOpeners    ? recentOpeners : recentOpeners.slice(0, 8);
  const displayedNonOpeners = showAllNonOpeners ? nonOpeners    : nonOpeners.slice(0, 8);
  const displayedUrls       = showAllUrls       ? topUrls       : topUrls.slice(0, 5);

  return (
    <>
      <Head>
        <title>{campaign.title} — Analytics · Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <div className="min-h-screen bg-gray-50 pb-12">
          <div className="container mx-auto px-4 max-w-7xl py-8 space-y-6">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/campaigns"
                  className="p-2 hover:bg-white rounded-xl border border-transparent 
                             hover:border-gray-200 transition-all text-gray-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-[#029bba]" />
                    Campaign Analytics
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5 max-w-md truncate">
                    {campaign.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold">
                  Sent {formatDate(campaign.sentAt)}
                </span>
                <button
                  onClick={() => fetchAnalytics(true)}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-2 bg-white border 
                             border-gray-200 rounded-xl text-sm font-semibold 
                             text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Campaign info bar ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-400 font-semibold">Subject: </span>
                  <span className="text-gray-800 font-bold">{campaign.subject}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">Template: </span>
                  <span className="text-gray-700 capitalize">{campaign.template}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">Recipients: </span>
                  <span className="text-gray-700 capitalize">
                    {campaign.recipientSource === 'both'
                      ? 'Subscribers + Leads'
                      : campaign.recipientSource}
                  </span>
                </div>
                <Link
                  href={`/admin/campaigns/${campaign._id}/edit`}
                  className="ml-auto text-[#029bba] hover:text-[#027a94] font-semibold 
                             flex items-center gap-1 text-xs"
                >
                  View Campaign
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* ── Key Metrics ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Emails Sent"
                value={metrics.totalSent.toLocaleString()}
                sub={`${metrics.totalBounced} bounced`}
                icon={<Mail className="w-5 h-5" />}
                color="text-[#029bba]"
                bgColor="bg-[#029bba]/10"
                trend="neutral"
              />
              <MetricCard
                label="Open Rate"
                value={`${metrics.openRate}%`}
                sub={`${metrics.totalOpened} unique opens`}
                icon={<Eye className="w-5 h-5" />}
                color={openRateTrend === 'up' ? 'text-emerald-600' : 'text-amber-600'}
                bgColor={openRateTrend === 'up' ? 'bg-emerald-50' : 'bg-amber-50'}
                trend={openRateTrend}
                benchmark="Industry avg: 21% · Good: 30%+"
              />
              <MetricCard
                label="Click Rate"
                value={`${metrics.clickRate}%`}
                sub={`${metrics.totalClicked} unique clicks`}
                icon={<MousePointerClick className="w-5 h-5" />}
                color={clickRateTrend === 'up' ? 'text-emerald-600' : 'text-amber-600'}
                bgColor={clickRateTrend === 'up' ? 'bg-emerald-50' : 'bg-amber-50'}
                trend={clickRateTrend}
                benchmark="Industry avg: 2.6% · Good: 3%+"
              />
              <MetricCard
                label="Click-to-Open"
                value={`${metrics.ctoRate}%`}
                sub="Of openers who clicked"
                icon={<TrendingUp className="w-5 h-5" />}
                color="text-purple-600"
                bgColor="bg-purple-50"
                trend={metrics.ctoRate >= 10 ? 'up' : 'neutral'}
                benchmark="Industry avg: 10%+"
              />
            </div>

            {/* ── Secondary Metrics ───────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Opens',
                  value: metrics.totalOpenCount,
                  sub:   'incl. re-opens',
                  color: 'text-[#029bba]',
                },
                {
                  label: 'Total Clicks',
                  value: metrics.totalClickCount,
                  sub:   'incl. re-clicks',
                  color: 'text-emerald-600',
                },
                {
                  label: 'Bounced',
                  value: metrics.totalBounced,
                  sub:   `${metrics.bounceRate}% bounce rate`,
                  color: 'text-red-500',
                },
                {
                  label: 'Unsubscribed',
                  value: metrics.totalUnsubscribed,
                  sub:   'opted out',
                  color: 'text-gray-600',
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <p className={`text-2xl font-black ${m.color}`}>
                    {m.value.toLocaleString()}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Timeline Chart + Breakdown ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Timeline chart — 2/3 width */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-black text-[#004063] mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#029bba]" />
                  Opens & Clicks Over Time
                </h2>
                <MiniBarChart data={timeline} height={180} />
              </div>

              {/* Subscriber vs Lead breakdown — 1/3 width */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-black text-[#004063] mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#029bba]" />
                  By Recipient Type
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Subscribers', data: byType.subscribers, color: '#029bba' },
                    { label: 'Leads',       data: byType.leads,       color: '#f59e0b' },
                  ].map(({ label, data: d, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-bold text-gray-700">{label}</span>
                        </div>
                        <span className="text-xs text-gray-500">{d.sent} sent</span>
                      </div>
                      {/* Open rate bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width:           `${Math.min(d.openRate, 100)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{d.openRate}% open rate</span>
                        <span>{d.opened} opened · {d.clicked} clicked</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick funnel */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                    Engagement Funnel
                  </p>
                  {[
                    { label: 'Sent',    value: metrics.totalSent,    pct: 100,                color: 'bg-[#029bba]' },
                    { label: 'Opened',  value: metrics.totalOpened,  pct: metrics.openRate,   color: 'bg-emerald-400' },
                    { label: 'Clicked', value: metrics.totalClicked, pct: metrics.clickRate,  color: 'bg-purple-400' },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 w-14 font-semibold">
                        {step.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${step.color}`}
                          style={{ width: `${step.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-gray-700 w-10 text-right">
                        {step.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Top Clicked URLs ────────────────────────────── */}
            {topUrls.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-black text-[#004063] mb-4 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-[#029bba]" />
                  Top Clicked Links
                </h2>
                <div className="space-y-2">
                  {displayedUrls.map((u, i) => {
                    const maxClicks = topUrls[0]?.totalClicks || 1;
                    const pct = Math.round((u.totalClicks / maxClicks) * 100);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl 
                                   hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xs font-black text-gray-400 w-5">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <a
                              href={u.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#029bba] hover:underline font-semibold truncate"
                            >
                              {truncateUrl(u.url)}
                            </a>
                            <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#029bba] flex-shrink-0 transition-colors" />
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-[#029bba] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-gray-800">
                            {u.totalClicks}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {u.uniqueClickers} unique
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {topUrls.length > 5 && (
                  <button
                    onClick={() => setShowAllUrls(!showAllUrls)}
                    className="mt-2 text-sm text-[#029bba] font-semibold hover:underline 
                               flex items-center gap-1"
                  >
                    {showAllUrls ? (
                      <><ChevronUp className="w-4 h-4" /> Show less</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Show all {topUrls.length} links</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ── Recipient Tables ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Openers table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-black text-[#004063] mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Recent Openers
                  <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 
                                   px-2 py-0.5 rounded-full font-bold">
                    {recentOpeners.length}
                  </span>
                </h2>
                {recentOpeners.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No opens tracked yet</p>
                    <p className="text-xs mt-1">Opens appear when recipients load images</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {displayedOpeners.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br 
                                          from-[#029bba] to-[#004063] flex items-center 
                                          justify-center text-white text-xs font-black 
                                          flex-shrink-0">
                            {(r.name || r.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">
                              {r.name || r.email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {r.name ? r.email : ''}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-[#029bba]/10 text-[#029bba] 
                                               px-1.5 py-0.5 rounded font-bold">
                                {r.openCount}×
                              </span>
                              {r.clickCount > 0 && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 
                                                 px-1.5 py-0.5 rounded font-bold">
                                  {r.clickCount} clicks
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatDate(r.firstOpenedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {recentOpeners.length > 8 && (
                      <button
                        onClick={() => setShowAllOpeners(!showAllOpeners)}
                        className="mt-2 text-sm text-[#029bba] font-semibold 
                                   hover:underline flex items-center gap-1"
                      >
                        {showAllOpeners ? (
                          <><ChevronUp className="w-4 h-4" /> Show less</>
                        ) : (
                          <><ChevronDown className="w-4 h-4" /> Show all {recentOpeners.length}</>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Non-openers table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-black text-[#004063] mb-4 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-gray-400" />
                  Non-Openers
                  <span className="ml-auto text-xs bg-gray-100 text-gray-600 
                                   px-2 py-0.5 rounded-full font-bold">
                    {metrics.totalSent - metrics.totalOpened} total
                  </span>
                </h2>
                {nonOpeners.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                    <p className="text-sm font-semibold text-emerald-600">
                      Everyone opened!
                    </p>
                    <p className="text-xs mt-1">100% open rate achieved</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-3">
                      Sample of recipients who haven't opened yet. 
                      Consider a follow-up campaign.
                    </p>
                    <div className="space-y-2">
                      {displayedNonOpeners.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center 
                                          justify-center text-gray-500 text-xs font-black 
                                          flex-shrink-0">
                            {(r.name || r.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-700 truncate">
                              {r.name || r.email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {r.name ? r.email : ''}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                              ${r.recipientType === 'lead'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}>
                              {r.recipientType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {nonOpeners.length > 8 && (
                      <button
                        onClick={() => setShowAllNonOpeners(!showAllNonOpeners)}
                        className="mt-2 text-sm text-[#029bba] font-semibold 
                                   hover:underline flex items-center gap-1"
                      >
                        {showAllNonOpeners ? (
                          <><ChevronUp className="w-4 h-4" /> Show less</>
                        ) : (
                          <><ChevronDown className="w-4 h-4" /> Show all {nonOpeners.length} shown</>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

            </div>

            {/* ── A/B Test Results ────────────────────────────── */}
            {data.abTest?.enabled && (
              <ABTestResultsSection
                abTest={data.abTest}
                campaignId={campaign._id}
                onWinnerPicked={() => fetchAnalytics(true)}
              />
            )}

            {/* ── Pro Tip ─────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-[#029bba]/10 to-[#004063]/10 
                            rounded-2xl border border-[#029bba]/20 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#029bba] flex items-center 
                                justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#004063] mb-1">
                    Analytics Pro Tips
                  </h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>Open Rate {'>'}30%</strong> — Excellent. Your subject line resonates with Pakistani buyers.</li>
                    <li>• <strong>Click-to-Open {'>'}10%</strong> — Your content matches what your audience wants.</li>
                    <li>• <strong>Non-openers</strong> — Send a follow-up in 3-5 days with a different subject line.</li>
                    <li>• <strong>Opens are tracked</strong> via a 1×1 pixel — Gmail image caching may undercount slightly.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </AdminLayout>
    </>
  );
}