// pages/developer/projects/[id]/analytics.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  CheckCircle2,
  Clock,
  Target,
  BarChart3,
  Activity,
  Loader2,
  AlertCircle,
  Calendar,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Download,
  RefreshCw,
  Zap,
  ShieldCheck,
  Building2,
  MapPin,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface ProjectAnalyticsData {
  project: {
    _id:           string;
    projectName:   string;
    slug:          string;
    city:          string;
    status:        string;
    totalUnits:    number;
    unitsAvailable: number;
    unitsSold:     number;
    unitsReserved: number;
    minPrice:      number;
    maxPrice:      number;
    createdAt:     string;
  };
  overview: {
    totalViews:      number;
    totalInquiries:  number;
    totalLeads:      number;
    totalRevenue:    number;
    conversionRate:  number;
    avgResponseTime: number;
    soldPercentage:  number;
    viewsTrend:      number;
    inquiriesTrend:  number;
    leadsTrend:      number;
    revenueTrend:    number;
  };
  unitBreakdown: Array<{
    unitType:      string;
    unitTypeName?: string;
    total:         number;
    available:     number;
    reserved:      number;
    sold:          number;
    minPrice:      number;
    maxPrice:      number;
    views:         number;
    inquiries:     number;
  }>;
  recentActivity: Array<{
    type:      string;
    message:   string;
    timestamp: string;
    icon?:     string;
  }>;
  leadsByStatus: Record<string, number>;
  viewsByDay:    Array<{ date: string; views: number; inquiries: number }>;
  topUnits: Array<{
    unitNumber: string;
    unitType:   string;
    status:     string;
    price:      number;
    views:      number;
    inquiries:  number;
  }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPKR(amount: number): string {
  if (!amount || amount <= 0) return '—';
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (amount >= 100_000) {
    const lac = amount / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

function formatNumber(num: number): string {
  if (!num && num !== 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short',
  });
}

// ════════════════════════════════════════════════════
// TREND INDICATOR
// ════════════════════════════════════════════════════

function TrendBadge({ value }: { value: number }): React.ReactElement {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600">
        <ArrowUpRight className="w-3.5 h-3.5" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-500">
        <ArrowDownRight className="w-3.5 h-3.5" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-gray-400">
      <Minus className="w-3.5 h-3.5" />
      0%
    </span>
  );
}

// ════════════════════════════════════════════════════
// STAT CARD
// ════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  subtitle,
  highlight,
}: {
  label:     string;
  value:     string | number;
  icon:      React.ReactElement;
  iconBg:    string;
  iconColor: string;
  trend?:    number;
  subtitle?: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5
                     ${highlight ? 'border-[#029bba]/30 ring-2 ring-[#029bba]/10' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-black ${highlight ? 'text-[#029bba]' : 'text-gray-900'}`}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════
// MINI BAR CHART
// ════════════════════════════════════════════════════

function MiniBarChart({
  data,
  label,
}: {
  data:  Array<{ date: string; views: number; inquiries: number }>;
  label: string;
}): React.ReactElement {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-[#004063] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#029bba]" />
          {label}
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#029bba]" />
            Views
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Inquiries
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center">
          <p className="text-sm text-gray-300">No data yet</p>
        </div>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {data.map((day, idx) => {
            const viewPct = Math.round((day.views / maxViews) * 100);
            const inqPct  = day.inquiries > 0
              ? Math.max(Math.round((day.inquiries / maxViews) * 100), 4)
              : 0;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-0.5 group"
                title={`${formatDate(day.date)}: ${day.views} views, ${day.inquiries} inquiries`}
              >
                {/* Bars */}
                <div className="w-full flex items-end gap-0.5 h-28">
                  {/* Views bar */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div
                      className="w-full bg-[#029bba] rounded-t transition-all duration-300
                                 group-hover:bg-[#027a94]"
                      style={{ height: `${Math.max(viewPct, viewPct > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  {/* Inquiries bar */}
                  {inqPct > 0 && (
                    <div className="flex-1 flex flex-col justify-end">
                      <div
                        className="w-full bg-amber-400 rounded-t transition-all duration-300"
                        style={{ height: `${inqPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Date label */}
                <span className="text-[8px] text-gray-300 group-hover:text-gray-500 transition-colors">
                  {formatDate(day.date).split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// UNIT TYPE BREAKDOWN TABLE
// ════════════════════════════════════════════════════

function UnitBreakdownTable({
  data,
}: {
  data: ProjectAnalyticsData['unitBreakdown'];
}): React.ReactElement {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Home className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No unit data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="font-bold text-sm text-[#004063] flex items-center gap-2">
          <Home className="w-4 h-4 text-[#029bba]" />
          Unit Type Performance
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Available</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Sold</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Price Range</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Views</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Inquiries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, idx) => {
              const soldPct = row.total > 0 ? Math.round((row.sold / row.total) * 100) : 0;
              return (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">
                      {row.unitTypeName ?? row.unitType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{row.total}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-emerald-600">{row.available}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold text-red-500">{row.sold}</span>
                      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${soldPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400">{soldPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">
                    {row.minPrice > 0 && (
                      <>
                        <span className="font-semibold text-[#029bba]">{formatPKR(row.minPrice)}</span>
                        {row.maxPrice !== row.minPrice && (
                          <> — {formatPKR(row.maxPrice)}</>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-600">
                    {formatNumber(row.views)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-600">
                    {formatNumber(row.inquiries)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// LEAD FUNNEL
// ════════════════════════════════════════════════════

function LeadFunnel({
  byStatus,
  total,
}: {
  byStatus: Record<string, number>;
  total:    number;
}): React.ReactElement {
  const stages = [
    { key: 'new',                   label: 'New Leads',      color: 'bg-blue-400' },
    { key: 'contacted',             label: 'Contacted',      color: 'bg-cyan-400' },
    { key: 'qualified',             label: 'Qualified',      color: 'bg-purple-400' },
    { key: 'site_visit_scheduled',  label: 'Site Visit',     color: 'bg-amber-400' },
    { key: 'proposal_sent',         label: 'Proposal Sent',  color: 'bg-orange-400' },
    { key: 'negotiation',           label: 'Negotiation',    color: 'bg-pink-400' },
    { key: 'won',                   label: 'Won',            color: 'bg-emerald-500' },
    { key: 'lost',                  label: 'Lost',           color: 'bg-red-400' },
  ];

  const maxCount = Math.max(...Object.values(byStatus), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-sm text-[#004063] flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-[#029bba]" />
        Lead Pipeline
      </h3>

      {total === 0 ? (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No leads yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage) => {
            const count = byStatus[stage.key] ?? 0;
            const pct   = Math.round((count / maxCount) * 100);

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0 text-right font-medium">
                  {stage.label}
                </span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-500
                                flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%` }}
                  >
                    {count > 0 && (
                      <span className="text-[9px] text-white font-bold">{count}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-600 w-10 flex-shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// TOP UNITS TABLE
// ════════════════════════════════════════════════════

function TopUnitsTable({
  units,
}: {
  units: ProjectAnalyticsData['topUnits'];
}): React.ReactElement {
  if (!units || units.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No unit data yet</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    reserved:  'bg-amber-100 text-amber-700',
    sold:      'bg-red-100 text-red-600',
    on_hold:   'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="font-bold text-sm text-[#004063] flex items-center gap-2">
          <Star className="w-4 h-4 text-[#029bba]" />
          Top Performing Units
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Price</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Views</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Inquiries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {units.map((unit, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-800">#{unit.unitNumber}</p>
                  <p className="text-xs text-gray-400">
                    {unit.unitType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                    ${statusColors[unit.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {unit.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#029bba]">
                  {formatPKR(unit.price)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-600">
                  {formatNumber(unit.views)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-600">
                  {unit.inquiries}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// RECENT ACTIVITY
// ════════════════════════════════════════════════════

function RecentActivity({
  activities,
}: {
  activities: ProjectAnalyticsData['recentActivity'];
}): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-sm text-[#004063] flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-[#029bba]" />
        Recent Activity
      </h3>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-[#029bba]/10 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-[#029bba]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 font-medium">{activity.message}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(activity.timestamp).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function ProjectAnalyticsPage(): React.ReactElement {
  const router      = useRouter();
  const { id }      = router.query;

  const [data, setData]           = useState<ProjectAnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const DATE_RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
    { value: '7d',  label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  // ── Fetch analytics ──
  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (!id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      // Fetch project data + analytics in parallel
      const [projectRes, analyticsRes, leadsRes] = await Promise.all([
        fetch(`/api/projects/${id}`, { credentials: 'include' }),
        fetch(`/api/developer/analytics?projectId=${id}&range=${dateRange}`, {
          credentials: 'include',
        }),
        fetch(`/api/developer/leads?projectId=${id}&limit=5`, {
          credentials: 'include',
        }),
      ]);

      const projectData   = await projectRes.json();
      const analyticsData = await analyticsRes.json();
      const leadsData     = await leadsRes.json();

      if (!projectData.success) {
        setError('Project not found');
        return;
      }

      const project = projectData.data?.project ?? projectData.project ?? {};

      // Build analytics data from available APIs
      const analytics: ProjectAnalyticsData = {
        project: {
          _id:            project._id ?? id as string,
          projectName:    project.projectName ?? 'Project',
          slug:           project.slug ?? '',
          city:           project.city ?? '',
          status:         project.status ?? 'draft',
          totalUnits:     project.totalUnits ?? 0,
          unitsAvailable: project.unitsAvailable ?? 0,
          unitsSold:      project.unitsSold ?? 0,
          unitsReserved:  project.unitsReserved ?? 0,
          minPrice:       project.minPrice ?? 0,
          maxPrice:       project.maxPrice ?? 0,
          createdAt:      project.createdAt ?? new Date().toISOString(),
        },
        overview: analyticsData.success
          ? {
              totalViews:      analyticsData.data?.totalViews ?? 0,
              totalInquiries:  analyticsData.data?.totalInquiries ?? 0,
              totalLeads:      leadsData.data?.pagination?.totalCount ?? 0,
              totalRevenue:    analyticsData.data?.totalRevenue ?? 0,
              conversionRate:  analyticsData.data?.conversionRate ?? 0,
              avgResponseTime: analyticsData.data?.avgResponseTime ?? 0,
              soldPercentage:  project.totalUnits > 0
                ? Math.round((project.unitsSold / project.totalUnits) * 100)
                : 0,
              viewsTrend:     analyticsData.data?.viewsTrend ?? 0,
              inquiriesTrend: analyticsData.data?.inquiriesTrend ?? 0,
              leadsTrend:     analyticsData.data?.leadsTrend ?? 0,
              revenueTrend:   analyticsData.data?.revenueTrend ?? 0,
            }
          : {
              totalViews: project.views ?? 0, totalInquiries: project.inquiryCount ?? 0,
              totalLeads: 0, totalRevenue: 0, conversionRate: 0, avgResponseTime: 0,
              soldPercentage: 0, viewsTrend: 0, inquiriesTrend: 0,
              leadsTrend: 0, revenueTrend: 0,
            },
        unitBreakdown:  analyticsData.data?.unitBreakdown ?? project.unitTypeBreakdown?.map((u: any) => ({
          unitType:     u.type,
          unitTypeName: u.name,
          total:        u.totalUnits ?? 0,
          available:    u.availableUnits ?? 0,
          reserved:     u.reservedUnits ?? 0,
          sold:         u.soldUnits ?? 0,
          minPrice:     u.priceRange?.min ?? 0,
          maxPrice:     u.priceRange?.max ?? 0,
          views:        u.viewCount ?? 0,
          inquiries:    u.inquiryCount ?? 0,
        })) ?? [],
        recentActivity: analyticsData.data?.recentActivity ?? [],
        leadsByStatus:  leadsData.data?.stats?.byStatus
          ? Object.fromEntries(leadsData.data.stats.byStatus.map((s: any) => [s._id, s.count]))
          : {},
        viewsByDay:     analyticsData.data?.viewsByDay ?? [],
        topUnits:       analyticsData.data?.topUnits ?? [],
      };

      setData(analytics);
    } catch {
      setError('Analytics load nahi ho sake. Dobara try karein.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <DeveloperLayout>
      <Head>
        <title>
          Analytics — {data?.project.projectName ?? 'Project'} | Highrise.pk Developer
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/developer/projects/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500
                     hover:text-[#029bba] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063]">
              Project Analytics
            </h1>
            {data && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-500">{data.project.projectName}</p>
                <span className="text-gray-300">·</span>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  {data.project.city}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Date range */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                              ${dateRange === opt.value
                                ? 'bg-white text-[#029bba] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                              }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-gray-200 bg-white
                         text-gray-500 hover:text-[#029bba] hover:border-[#029bba]/30
                         transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-gray-700 mb-1">Error Loading Analytics</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-[#029bba] text-white text-sm font-semibold
                       hover:bg-[#027a94] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Analytics content */}
      {!loading && !error && data && (
        <div className="space-y-6">

          {/* ── Overview stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Views"
              value={data.overview.totalViews}
              icon={<Eye className="w-5 h-5" />}
              iconBg="bg-cyan-50"
              iconColor="text-cyan-600"
              trend={data.overview.viewsTrend}
              subtitle={`Last ${dateRange === 'all' ? 'all time' : dateRange}`}
            />
            <StatCard
              label="Inquiries"
              value={data.overview.totalInquiries}
              icon={<MessageSquare className="w-5 h-5" />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              trend={data.overview.inquiriesTrend}
            />
            <StatCard
              label="Active Leads"
              value={data.overview.totalLeads}
              icon={<Users className="w-5 h-5" />}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              trend={data.overview.leadsTrend}
            />
            <StatCard
              label="Units Sold"
              value={`${data.overview.soldPercentage}%`}
              icon={<Target className="w-5 h-5" />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              subtitle={`${data.project.unitsSold} of ${data.project.totalUnits} units`}
              highlight
            />
          </div>

          {/* ── Project info strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-black text-emerald-600">{data.project.unitsAvailable}</p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Available</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-black text-amber-600">{data.project.unitsReserved}</p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Reserved</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-black text-[#029bba]">{formatPKR(data.project.minPrice)}</p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Starting From</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
              <p className="text-2xl font-black text-gray-700">
                {data.overview.conversionRate > 0
                  ? `${data.overview.conversionRate.toFixed(1)}%`
                  : '—'
                }
              </p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Conversion Rate</p>
            </div>
          </div>

          {/* ── Chart + Pipeline ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <MiniBarChart
              data={data.viewsByDay}
              label="Views & Inquiries Trend"
            />
            <LeadFunnel
              byStatus={data.leadsByStatus}
              total={data.overview.totalLeads}
            />
          </div>

          {/* ── Unit breakdown ── */}
          <UnitBreakdownTable data={data.unitBreakdown} />

          {/* ── Top units + Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TopUnitsTable units={data.topUnits} />
            <RecentActivity activities={data.recentActivity} />
          </div>

          {/* ── Revenue section ── */}
          {data.overview.totalRevenue > 0 && (
            <div className="bg-gradient-to-r from-[#004063] to-[#029bba] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">
                    Total Revenue Generated
                  </p>
                  <p className="text-3xl font-black text-white">
                    {formatPKR(data.overview.totalRevenue)}
                  </p>
                  {data.overview.revenueTrend !== 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {data.overview.revenueTrend > 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm font-semibold
                                        ${data.overview.revenueTrend > 0
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                        }`}>
                        {Math.abs(data.overview.revenueTrend).toFixed(1)}% vs previous period
                      </span>
                    </div>
                  )}
                </div>
                <DollarSign className="w-16 h-16 text-white/20" />
              </div>
            </div>
          )}

          {/* ── Project age info ── */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#029bba]" />
                Listed on{' '}
                <strong className="text-gray-700">
                  {new Date(data.project.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </strong>
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#029bba]" />
                Status:{' '}
                <strong className="text-gray-700 capitalize">{data.project.status}</strong>
              </span>
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#029bba]" />
                {data.project.totalUnits} Total Units
              </span>
            </div>
          </div>
        </div>
      )}
    </DeveloperLayout>
  );
}