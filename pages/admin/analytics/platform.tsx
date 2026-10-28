// pages/admin/analytics/platform.tsx
// Highrise.pk — Platform overview analytics (properties, users, blogs, emails)
// Compliant: no AdminGuard, no ui/Card, brand colors, Head noindex

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Building2,
  Users,
  FileText,
  Mail,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Eye,
  MousePointerClick,
  RefreshCw,
  Building,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';

type DateRangeKey = '7days' | '30days' | '90days' | '1year';

interface AnalyticsData {
  overview: {
    properties: {
      total: number;
      change: string;
      approved: number;
      pending: number;
      rejected: number;
      draft: number;
    };
    users: {
      total: number;
      change: string;
      active: number;
      pending: number;
      suspended: number;
      banned: number;
    };
    blogs: {
      total: number;
      change: string;
      published: number;
      draft: number;
      scheduled: number;
    };
    emails: {
      total: number;
      change: string;
      sent: number;
      failed: number;
      pending: number;
    };
    developers: {
      total: number;
      verified: number;
      pending: number;
    };
    inquiries: {
      total: number;
      new: number;
      contacted: number;
    };
    comments: {
      total: number;
      approved: number;
      pending: number;
    };
  };
  charts: {
    userGrowth: Array<{ date: string; users: number }>;
    propertyTrends: Array<{ date: string; properties: number }>;
    emailTrends: Array<{ date: string; emails: number }>;
    propertyStatus: Array<{ name: string; value: number; color: string }>;
    emailStatus: Array<{ name: string; value: number; color: string }>;
    userStatus: Array<{ name: string; value: number; color: string }>;
  };
  topProperties: Array<{
    _id: string;
    title: string;
    views: number;
    inquiries: number;
    status: string;
    city: string;
    propertyType: string;
  }>;
  topBlogs: Array<{
    _id: string;
    title: string;
    views: number;
    comments: number;
    slug: string;
  }>;
}

interface AnalyticsApiResult {
  success: boolean;
  data?: AnalyticsData;
  message?: string;
}

const ICON_TONES: Record<string, string> = {
  teal: 'bg-[#029bba]/10 text-[#029bba]',
  navy: 'bg-[#004063]/10 text-[#004063]',
  success: 'bg-[#10b981]/10 text-[#10b981]',
  warning: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  error: 'bg-[#ef4444]/10 text-[#ef4444]',
  purple: 'bg-[#7c3aed]/10 text-[#7c3aed]',
};

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  tone,
  subtitle,
}: {
  title: string;
  value: number | string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof ICON_TONES;
  subtitle?: string;
}): React.ReactElement {
  const isPositive = Boolean(change?.startsWith('+'));
  const isNegative = Boolean(change?.startsWith('-'));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${ICON_TONES[tone]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change ? (
          <div
            className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
              isPositive
                ? 'bg-[#10b981]/10 text-[#10b981]'
                : isNegative
                  ? 'bg-[#ef4444]/10 text-[#ef4444]'
                  : 'bg-gray-50 text-gray-600'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : null}
            {isNegative ? <TrendingDown className="w-3 h-3" /> : null}
            {change}
          </div>
        ) : null}
      </div>
      <h3 className="text-3xl font-bold text-[#004063] mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
      <p className="text-gray-500 text-sm">{title}</p>
      {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}): React.ReactElement | null {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100">
      <p className="text-sm font-semibold text-[#004063]">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const statusStyles: Record<string, string> = {
    approved: 'bg-[#10b981]/10 text-[#10b981]',
    active: 'bg-[#10b981]/10 text-[#10b981]',
    pending: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    rejected: 'bg-[#ef4444]/10 text-[#ef4444]',
    draft: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
        statusStyles[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
}

export default function PlatformAnalyticsPage(): React.ReactElement {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeKey>('30days');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/admin/analytics?range=${dateRange}`, {
        credentials: 'include',
      });
      const result = (await response.json()) as AnalyticsApiResult;

      if (!response.ok || !result.success || !result.data) {
        setError(result.message || 'Failed to fetch analytics');
        setData(null);
        return;
      }

      setData(result.data);
      setError(null);
    } catch {
      setError('Failed to connect to server');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <>
      <Head>
        <title>Platform Analytics | Admin | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6 pb-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-2 bg-[#029bba]/10 text-[#029bba] rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black text-[#004063]">Platform Analytics</h1>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Properties, users, content, and email performance overview.
              </p>
              <Link
                href="/admin/analytics"
                className="inline-block mt-2 text-xs font-bold text-[#029bba] hover:underline"
              >
                Open Lead Funnel &amp; AI Analytics →
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchAnalytics(true)}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-[#029bba] hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                title="Refresh data"
                aria-label="Refresh analytics"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-[#004063] focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none bg-white"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">Last year</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Loader2 className="w-12 h-12 animate-spin text-[#029bba] mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading platform analytics...</p>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-lg mx-auto">
              <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#004063] mb-2">Failed to Load Analytics</h3>
              <p className="text-gray-500 mb-4 text-sm">{error}</p>
              <button
                type="button"
                onClick={() => void fetchAnalytics()}
                className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-semibold text-sm hover:bg-[#027a94] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : null}

          {!loading && !error && data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard
                  title="Total Properties"
                  value={data.overview.properties.total}
                  change={data.overview.properties.change}
                  icon={Building2}
                  tone="teal"
                  subtitle={`${data.overview.properties.pending} pending approval`}
                />
                <StatCard
                  title="Total Users"
                  value={data.overview.users.total}
                  change={data.overview.users.change}
                  icon={Users}
                  tone="navy"
                  subtitle={`${data.overview.users.active} active`}
                />
                <StatCard
                  title="Blog Posts"
                  value={data.overview.blogs.total}
                  change={data.overview.blogs.change}
                  icon={FileText}
                  tone="purple"
                  subtitle={`${data.overview.blogs.published} published`}
                />
                <StatCard
                  title="Emails Sent"
                  value={data.overview.emails.sent}
                  change={data.overview.emails.change}
                  icon={Mail}
                  tone="success"
                  subtitle={`${data.overview.emails.failed} failed`}
                />
                <StatCard
                  title="Developers"
                  value={data.overview.developers.total}
                  icon={Building}
                  tone="warning"
                  subtitle={`${data.overview.developers.verified} verified`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#f59e0b]/10">
                    <MousePointerClick className="w-5 h-5 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#004063]">{data.overview.inquiries.total}</p>
                    <p className="text-sm text-gray-500">Total Inquiries</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#10b981]/10">
                    <UserCheck className="w-5 h-5 text-[#10b981]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#004063]">{data.overview.inquiries.new}</p>
                    <p className="text-sm text-gray-500">New Inquiries</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#029bba]/10">
                    <MessageSquare className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#004063]">{data.overview.comments.total}</p>
                    <p className="text-sm text-gray-500">Total Comments</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#ef4444]/10">
                    <AlertCircle className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#004063]">{data.overview.comments.pending}</p>
                    <p className="text-sm text-gray-500">Pending Comments</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#004063] mb-4">User Growth</h2>
                  <div className="h-72">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.charts.userGrowth}>
                          <defs>
                            <linearGradient id="colorUsersPlatform" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#029bba" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#029bba" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="users"
                            stroke="#029bba"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorUsersPlatform)"
                            name="New Users"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#004063] mb-4">Property Submissions</h2>
                  <div className="h-72">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.propertyTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="properties" fill="#029bba" radius={[4, 4, 0, 0]} name="Properties" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(
                  [
                    { title: 'Properties by Status', rows: data.charts.propertyStatus },
                    { title: 'Users by Status', rows: data.charts.userStatus },
                    { title: 'Email Statistics', rows: data.charts.emailStatus },
                  ] as const
                ).map((block) => (
                  <div key={block.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-[#004063] mb-4">{block.title}</h2>
                    <div className="h-64">
                      {mounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={block.rows}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {block.rows.map((entry, index) => (
                                <Cell key={`cell-${block.title}-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              formatter={(value) => (
                                <span className="text-sm text-gray-600">{String(value)}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-[#004063] mb-4">Email Activity</h2>
                <div className="h-72">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.charts.emailTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="emails"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#10b981' }}
                          name="Emails Sent"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#004063]">Top Properties</h2>
                    <Link href="/admin/properties" className="text-sm font-semibold text-[#029bba] hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Property</th>
                          <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Views</th>
                          <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Inquiries</th>
                          <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.topProperties.length > 0 ? (
                          data.topProperties.map((property) => (
                            <tr key={property._id} className="hover:bg-gray-50">
                              <td className="py-3 px-2">
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{property.title}</p>
                                <p className="text-xs text-gray-500">{property.city}</p>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                  <Eye className="w-3 h-3" />
                                  {property.views.toLocaleString()}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center text-sm text-gray-600">{property.inquiries}</td>
                              <td className="py-3 px-2 text-center">
                                <StatusBadge status={property.status} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                              No properties found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#004063]">Top Blog Posts</h2>
                    <Link href="/admin/blogs" className="text-sm font-semibold text-[#029bba] hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Blog Title</th>
                          <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Views</th>
                          <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Comments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.topBlogs.length > 0 ? (
                          data.topBlogs.map((blog) => (
                            <tr key={blog._id} className="hover:bg-gray-50">
                              <td className="py-3 px-2">
                                <a
                                  href={`/blog/${blog.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-gray-900 hover:text-[#029bba] truncate block max-w-[200px]"
                                >
                                  {blog.title}
                                </a>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                  <Eye className="w-3 h-3" />
                                  {blog.views.toLocaleString()}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                  <MessageSquare className="w-3 h-3" />
                                  {blog.comments}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-gray-500 text-sm">
                              No blog posts found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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