// pages/admin/aleem/index.tsx
// Highrise.pk — Aleem AI Dashboard (admin)
// V6.4.1 — Live stats, hot leads alert, quota monitoring

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Bot,
  MessageCircle,
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Flame,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  Globe,
  Target,
  Zap,
} from 'lucide-react';

interface DashboardStats {
  conversationsToday:    number;
  leadsToday:            number;
  conversionRateToday:   number;
  activeNow:             number;
  conversationsThisWeek: number;
  leadsThisWeek:         number;
  conversionRateWeek:    number;
  totalConversations:    number;
  totalLeads:            number;
  totalHotLeads:         number;
  totalBurningLeads:     number;
  intentBreakdown: {
    buy: number; rent: number; invest: number;
    verify_society: number; price_check: number;
    general: number; unknown: number;
  };
  contextBreakdown: {
    property: number; project: number; society: number; general: number;
  };
  hourlyActivity: Array<{
    hour: string; conversations: number; leads: number;
  }>;
  quota: {
    used: number; limit: number; percentage: number;
    mode: 'normal' | 'priority' | 'lead_only';
    remaining: number; resetAt: number;
  };
}

export default function AleemDashboardPage(): React.ReactElement {
  const router = useRouter();
  const { status } = useSession();

  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/aleem');
    }
  }, [status, router]);

  // Fetch stats
  const fetchStats = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/aleem/dashboard-stats');
      const data = await res.json() as { success: boolean; data?: DashboardStats; error?: string };

      if (!res.ok || !data.success || !data.data) {
        setError(data.error ?? 'Failed to load stats');
        return;
      }
      setStats(data.data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <Head><title>Aleem Dashboard | Highrise Admin</title></Head>
        <div className="p-6">
          <div className="bg-[#fef2f2] border border-[#ef4444]/30 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-700 mb-2">Unable to Load Dashboard</h2>
            <p className="text-red-600 mb-4">{error || 'No data available'}</p>
            <button
              onClick={() => fetchStats()}
              className="px-5 py-2.5 bg-[#029bba] text-white rounded-xl font-medium hover:bg-[#027a94] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const totalHotAndBurning = stats.totalHotLeads + stats.totalBurningLeads;
  const quotaColor = stats.quota.mode === 'lead_only' ? 'red'
                   : stats.quota.mode === 'priority'  ? 'amber'
                   : 'green';

  // Build intent rows for display
  const intentRows = [
    { label: '🏠 Buy',           value: stats.intentBreakdown.buy,            color: '#029bba' },
    { label: '🔑 Rent',          value: stats.intentBreakdown.rent,           color: '#10b981' },
    { label: '📈 Invest',        value: stats.intentBreakdown.invest,         color: '#f59e0b' },
    { label: '🔍 Verify Society',value: stats.intentBreakdown.verify_society, color: '#7c3aed' },
    { label: '💰 Price Check',   value: stats.intentBreakdown.price_check,    color: '#06b6d4' },
    { label: '💬 General',       value: stats.intentBreakdown.general,        color: '#6b7280' },
  ].filter(row => row.value > 0);

  return (
    <AdminLayout>
      <Head><title>Aleem Dashboard | Highrise Admin</title></Head>

      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              Aleem AI Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Real-time performance + lead conversion metrics</p>
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* HOT LEADS ALERT */}
        {totalHotAndBurning > 0 && (
          <div className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <Flame className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">🔥 {totalHotAndBurning} Priority Lead{totalHotAndBurning > 1 ? 's' : ''} Need Attention!</h2>
                  <p className="text-white/90 text-sm mt-1">
                    {stats.totalBurningLeads} burning + {stats.totalHotLeads} hot leads pending — call within 1 hour for best conversion
                  </p>
                </div>
              </div>
              <Link href="/admin/aleem/leads?temperature=burning,hot">
                <button className="px-5 py-2.5 bg-white text-[#dc2626] rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2">
                  View Hot Leads
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* QUOTA STATUS */}
        <div className={`bg-white border-2 rounded-2xl p-5 ${
          quotaColor === 'red'   ? 'border-[#ef4444]' :
          quotaColor === 'amber' ? 'border-[#f59e0b]' :
                                   'border-[#10b981]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${
                quotaColor === 'red'   ? 'text-[#ef4444]' :
                quotaColor === 'amber' ? 'text-[#f59e0b]' :
                                         'text-[#10b981]'
              }`} />
              <h3 className="font-bold text-gray-900">Quota Status</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              quotaColor === 'red'   ? 'bg-[#fef2f2] text-[#ef4444]' :
              quotaColor === 'amber' ? 'bg-[#fef3c7] text-[#f59e0b]' :
                                       'bg-[#f0fdf4] text-[#10b981]'
            }`}>
              {stats.quota.mode === 'lead_only' ? '🔴 LEAD CAPTURE ONLY' :
               stats.quota.mode === 'priority'  ? '🟠 PRIORITY MODE' :
                                                  '🟢 NORMAL MODE'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {stats.quota.used.toLocaleString()} / {stats.quota.limit.toLocaleString()} requests
              </span>
              <span className="font-bold text-gray-900">{stats.quota.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  quotaColor === 'red'   ? 'bg-[#ef4444]' :
                  quotaColor === 'amber' ? 'bg-[#f59e0b]' :
                                           'bg-[#10b981]'
                }`}
                style={{ width: `${stats.quota.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Resets at midnight UTC (5 AM PKT) • {stats.quota.remaining.toLocaleString()} requests remaining
            </p>
          </div>
        </div>

        {/* MAIN STATS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<MessageCircle className="w-5 h-5" />}
            label="Conversations Today"
            value={stats.conversationsToday}
            color="#029bba"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Leads Today"
            value={stats.leadsToday}
            color="#10b981"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Conversion Rate"
            value={`${stats.conversionRateToday}%`}
            color="#f59e0b"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Active Now"
            value={stats.activeNow}
            color="#7c3aed"
            pulse={stats.activeNow > 0}
          />
        </div>

        {/* WEEK & ALL-TIME GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* This Week */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#029bba]" />
              This Week
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.conversationsThisWeek}</p>
                <p className="text-xs text-gray-500 mt-1">Conversations</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#10b981]">{stats.leadsThisWeek}</p>
                <p className="text-xs text-gray-500 mt-1">Leads</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#f59e0b]">{stats.conversionRateWeek}%</p>
                <p className="text-xs text-gray-500 mt-1">Conv. Rate</p>
              </div>
            </div>
          </div>

          {/* All-Time */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#029bba]" />
              All-Time Performance
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalConversations.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total Chats</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#10b981]">{stats.totalLeads.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total Leads</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#ef4444]">{totalHotAndBurning}</p>
                <p className="text-xs text-gray-500 mt-1">Hot Leads</p>
              </div>
            </div>
          </div>
        </div>

        {/* INTENT BREAKDOWN */}
        {intentRows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#029bba]" />
              Today's Intent Breakdown
            </h3>
            <div className="space-y-3">
              {intentRows.map((row) => {
                const max = Math.max(...intentRows.map(r => r.value), 1);
                const pct = Math.round((row.value / max) * 100);
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-40 text-sm text-gray-700">{row.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                      <div
                        className="h-full flex items-center justify-end px-3 text-white text-xs font-bold transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: row.color }}
                      >
                        {row.value > 0 && row.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUICK LINKS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/admin/aleem/conversations">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-[#029bba] transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-[#029bba]" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <h4 className="font-bold text-gray-900">View All Conversations</h4>
              <p className="text-sm text-gray-500 mt-1">Browse complete chat history with filters</p>
            </div>
          </Link>

          <Link href="/admin/aleem/leads">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-[#10b981] transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#10b981]" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <h4 className="font-bold text-gray-900">Aleem-Only Leads</h4>
              <p className="text-sm text-gray-500 mt-1">View leads captured by Aleem with priorities</p>
            </div>
          </Link>
        </div>

      </div>
    </AdminLayout>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color, pulse,
}: {
  icon: React.ReactElement;
  label: string;
  value: number | string;
  color: string;
  pulse?: boolean;
}): React.ReactElement {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}