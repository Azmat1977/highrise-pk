// pages/admin/analytics/index.tsx

import { useState, useEffect } from 'react';
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/AdminGuard";
import { Card } from "@/components/ui/card";
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
  UserCheck
} from "lucide-react";
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
  ResponsiveContainer
} from 'recharts';

// Types
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

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color,
  subtitle
}: { 
  title: string;
  value: number | string;
  change?: string;
  icon: any;
  color: string;
  subtitle?: string;
}) {
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');
  
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-[#029bba]/10 text-[#029bba]',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-green-50 text-green-600' : 
            isNegative ? 'bg-red-50 text-red-600' : 
            'bg-gray-50 text-gray-600'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : 
             isNegative ? <TrendingDown className="w-3 h-3" /> : null}
            {change}
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
      <p className="text-gray-500 text-sm">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </Card>
  );
}

// Custom Tooltip for Charts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
      statusStyles[status] || 'bg-gray-100 text-gray-800'
    }`}>
      {status}
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30days');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Loading State
  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="p-6 flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#029bba] mx-auto mb-4" />
              <p className="text-gray-500">Loading analytics data...</p>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  // Error State
  if (error) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="p-6 flex items-center justify-center min-h-[60vh]">
            <Card className="p-8 text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => fetchAnalytics()}
                className="px-4 py-2 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors"
              >
                Try Again
              </button>
            </Card>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  if (!data) return null;

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-500 mt-1">Track your platform performance and insights</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchAnalytics(true)}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-[#029bba] hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">Last year</option>
              </select>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              title="Total Properties"
              value={data.overview.properties.total}
              change={data.overview.properties.change}
              icon={Building2}
              color="teal"
              subtitle={`${data.overview.properties.pending} pending approval`}
            />
            <StatCard
              title="Total Users"
              value={data.overview.users.total}
              change={data.overview.users.change}
              icon={Users}
              color="blue"
              subtitle={`${data.overview.users.active} active`}
            />
            <StatCard
              title="Blog Posts"
              value={data.overview.blogs.total}
              change={data.overview.blogs.change}
              icon={FileText}
              color="purple"
              subtitle={`${data.overview.blogs.published} published`}
            />
            <StatCard
              title="Emails Sent"
              value={data.overview.emails.sent}
              change={data.overview.emails.change}
              icon={Mail}
              color="green"
              subtitle={`${data.overview.emails.failed} failed`}
            />
            <StatCard
              title="Developers"
              value={data.overview.developers.total}
              icon={Building}
              color="orange"
              subtitle={`${data.overview.developers.verified} verified`}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-50">
                <MousePointerClick className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.overview.inquiries.total}</p>
                <p className="text-sm text-gray-500">Total Inquiries</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-50">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.overview.inquiries.new}</p>
                <p className="text-sm text-gray-500">New Inquiries</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.overview.comments.total}</p>
                <p className="text-sm text-gray-500">Total Comments</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-50">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.overview.comments.pending}</p>
                <p className="text-sm text-gray-500">Pending Comments</p>
              </div>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.userGrowth}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#029bba" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#029bba" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#029bba" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorUsers)" 
                      name="New Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Property Trends Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Submissions</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.propertyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="properties" 
                      fill="#029bba" 
                      radius={[4, 4, 0, 0]}
                      name="Properties"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Charts Row 2 - Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Property Status Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties by Status</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.propertyStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.charts.propertyStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* User Status Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Status</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.userStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.charts.userStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Email Status Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Statistics</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.emailStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.charts.emailStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Email Trends Chart */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Activity</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.emailTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="emails" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#22c55e' }}
                    name="Emails Sent"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Properties Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Top Properties</h2>
                <a 
                  href="/admin/properties" 
                  className="text-sm text-[#029bba] hover:underline"
                >
                  View all ?
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Views</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Inquiries</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topProperties.length > 0 ? (
                      data.topProperties.map((property) => (
                        <tr key={property._id} className="hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                                {property.title}
                              </p>
                              <p className="text-xs text-gray-500">{property.city}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                              <Eye className="w-3 h-3" />
                              {property.views.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-sm text-gray-600">
                            {property.inquiries}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <StatusBadge status={property.status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No properties found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Top Blogs Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Top Blog Posts</h2>
                <a 
                  href="/admin/blogs" 
                  className="text-sm text-[#029bba] hover:underline"
                >
                  View all ?
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Blog Title</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Views</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Comments</th>
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
                        <td colSpan={3} className="py-8 text-center text-gray-500">
                          No blog posts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
