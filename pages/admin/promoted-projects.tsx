// pages/admin/promoted-projects.tsx
// --- ENTERPRISE SPONSORED ANALYTICS & CAMPAIGN DASHBOARD ---
// Security Hardened | Role Enforced | Metric Driven | 100% Pure ASCII

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Star,
  Clock,
  Eye,
  MousePointerClick,
  Percent,
  RefreshCw,
  Search,
  Building2,
  MapPin,
  X,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Power,
  Calendar,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface ProjectRow {
  _id: string;
  slug?: string;
  projectName: string;
  city: string;
  areaName: string;
  projectCategory: string;
  status: string;
  isVerified: boolean;
  isFeatured?: boolean;
  isDeleted?: boolean;
  developerProfile?: {
    companyName?: string;
    logo?: string;
  } | null;
  promotionStartDate?: string | null;
  promotionEndDate?: string | null;
  promotionImpressions?: number;
  promotionClicks?: number;
}

interface BannerState {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export default function AdminPromotedProjectsPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Auth Guard
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || (session.user as { role?: string })?.role !== 'admin') {
      void router.replace('/login?redirect=/admin/promoted-projects');
    }
  }, [session, authStatus, router]);

  // Banner Auto-dismiss
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // Fetch Projects Data
  const fetchProjects = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch('/api/admin/projects?limit=250&page=1', {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.projects)) {
        // Filter down to projects that have a promotion signature (past, present, or scheduled)
        const sponsoredOnly = (data.projects as ProjectRow[]).filter(
          (p) => p.isFeatured || p.promotionStartDate || p.promotionEndDate
        );
        setProjects(sponsoredOnly);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Failed to load campaigns.' });
      }
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network failure loading dashboard.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session && (session.user as { role?: string })?.role === 'admin') {
      fetchProjects();
    }
  }, [session, fetchProjects]);

  // Campaign Duration Mathematics
  const getCampaignStatus = (p: ProjectRow): 'active' | 'upcoming' | 'expired' => {
    if (!p.isFeatured) return 'expired';
    const now = new Date();
    const start = p.promotionStartDate ? new Date(p.promotionStartDate) : null;
    const end = p.promotionEndDate ? new Date(p.promotionEndDate) : null;

    if (start && now < start) return 'upcoming';
    if (end && now > end) return 'expired';
    return 'active';
  };

  const getDaysRemaining = (p: ProjectRow): number => {
    if (!p.promotionEndDate) return 0;
    const diff = new Date(p.promotionEndDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Inline Quick Actions
  const handleExtendCampaign = async (projectId: string, days: number) => {
    setProcessingId(projectId);
    try {
      const p = projects.find((x) => x._id === projectId);
      if (!p) return;

      const currentEnd = p.promotionEndDate ? new Date(p.promotionEndDate) : new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + days);

      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'promote',
          isFeatured: true,
          promotionStartDate: p.promotionStartDate ?? new Date().toISOString(),
          promotionEndDate: newEnd.toISOString(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBanner({ type: 'success', message: `Campaign extended cleanly by ${days} days.` });
        await fetchProjects(true);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Extension failed.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Failed to communicate with sponsorship service.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivateCampaign = async (projectId: string) => {
    if (!confirm('Are you sure you want to immediately terminate this campaign?')) return;
    setProcessingId(projectId);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'promote',
          isFeatured: false,
          promotionStartDate: null,
          promotionEndDate: null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBanner({ type: 'success', message: 'Campaign terminated and demoted to organic listing.' });
        await fetchProjects(true);
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Deactivation failed.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Failed to deactivate campaign.' });
    } finally {
      setProcessingId(null);
    }
  };

  // Client-Side Searching & Categorizing
  const filtered = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.projectName.toLowerCase().includes(term) ||
      p.city.toLowerCase().includes(term) ||
      (p.developerProfile?.companyName ?? '').toLowerCase().includes(term);

    const campStatus = getCampaignStatus(p);
    const matchesStatus = statusFilter === 'all' || campStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const stats = {
    activeCount: projects.filter((p) => getCampaignStatus(p) === 'active').length,
    upcomingCount: projects.filter((p) => getCampaignStatus(p) === 'upcoming').length,
    totalImpressions: projects.reduce((sum, p) => sum + (p.promotionImpressions ?? 0), 0),
    totalClicks: projects.reduce((sum, p) => sum + (p.promotionClicks ?? 0), 0),
  };

  const avgCTR =
    stats.totalImpressions > 0
      ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)
      : '0.00';

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== 'admin') return <div />;

  return (
    <>
      <Head>
        <title>Sponsorship Command Center | Admin - Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <div className="space-y-6 pb-12">
          {/* Floating Message Banner */}
          {banner && (
            <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-sm max-w-sm w-full ${
              banner.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
                : 'bg-red-50/95 border-red-200 text-red-800'
            }`}>
              <span className="text-xs font-bold flex-1">{banner.message}</span>
              <button onClick={() => setBanner(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
                <Star className="w-6 h-6 text-[#029bba] fill-[#029bba]" />
                <span>Monetization &amp; Ad Management</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time impression audits and CTR validation for active sponsored projects
              </p>
            </div>

            <button
              onClick={() => fetchProjects(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.activeCount}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Placements</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center text-[#029bba]">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.totalImpressions.toLocaleString()}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Impressions</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Clicks</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{avgCTR}%</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Average CTR</p>
              </div>
            </div>
          </div>

          {/* Filtering Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {[
                { key: 'all', label: 'All Promotions' },
                { key: 'active', label: 'Active Placement' },
                { key: 'upcoming', label: 'Scheduled' },
                { key: 'expired', label: 'Lapsed/Expired' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === tab.key
                      ? 'bg-[#004063] text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search builder, campaign name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#029bba]"
              />
            </div>
          </div>

          {/* Core Table View */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-16 text-center">
                <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-xs font-medium">Aggregating telemetry tables...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-800 font-bold text-sm">No sponsorships match selection</p>
                <p className="text-xs text-gray-400 mt-1">Sponsor lists on /admin/projects to display live telemetry tracking here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150">
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project / Builder</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Period / Duration</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Impressions</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Clicks</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">CTR %</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Quick Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((p) => {
                      const cStatus = getCampaignStatus(p);
                      const remDays = getDaysRemaining(p);
                      const imp = p.promotionImpressions ?? 0;
                      const clk = p.promotionClicks ?? 0;
                      const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : '0.00';

                      return (
                        <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Project Identification */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5 flex items-center justify-center border border-gray-100 flex-shrink-0 text-[#029bba]">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-xs truncate max-w-[180px]">{p.projectName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <p className="text-[10px] text-gray-500 truncate max-w-[150px]">
                                    {p.city}, {p.areaName}
                                  </p>
                                </div>
                                <p className="text-[9px] text-[#029bba] font-bold uppercase mt-1">
                                  {p.developerProfile?.companyName ?? 'Independent Developer'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Time period */}
                          <td className="px-5 py-4">
                            {cStatus === 'expired' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold">
                                <AlertCircle className="w-3 h-3" /> Lapsed
                              </span>
                            ) : cStatus === 'upcoming' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold">
                                <Calendar className="w-3 h-3" /> Scheduled
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold animate-pulse">
                                  Live Placement
                                </span>
                                <p className="text-[10px] text-gray-400">
                                  {remDays} days remaining
                                </p>
                              </div>
                            )}

                            {p.promotionStartDate && p.promotionEndDate && (
                              <p className="text-[9px] text-gray-400 mt-1 font-semibold">
                                {new Date(p.promotionStartDate).toLocaleDateString('en-PK')} - {new Date(p.promotionEndDate).toLocaleDateString('en-PK')}
                              </p>
                            )}
                          </td>

                          {/* Impressions */}
                          <td className="px-5 py-4 text-center">
                            <span className="text-xs font-bold text-gray-900">{imp.toLocaleString()}</span>
                          </td>

                          {/* Clicks */}
                          <td className="px-5 py-4 text-center">
                            <span className="text-xs font-bold text-gray-900">{clk.toLocaleString()}</span>
                          </td>

                          {/* CTR */}
                          <td className="px-5 py-4 text-center">
                            <span className="text-xs font-black text-[#029bba]">{ctr}%</span>
                          </td>

                          {/* Inline Controls */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {processingId === p._id ? (
                                <span className="w-4 h-4 border-2 border-[#029bba] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  {cStatus !== 'expired' && (
                                    <>
                                      <button
                                        onClick={() => handleExtendCampaign(p._id, 7)}
                                        className="px-2 py-1 text-[10px] font-black border border-gray-200 hover:border-[#029bba] text-gray-500 hover:text-[#029bba] rounded-lg transition-colors"
                                        title="Extend campaign by 7 days"
                                      >
                                        +7d
                                      </button>
                                      <button
                                        onClick={() => handleExtendCampaign(p._id, 30)}
                                        className="px-2 py-1 text-[10px] font-black border border-gray-200 hover:border-[#029bba] text-gray-500 hover:text-[#029bba] rounded-lg transition-colors"
                                        title="Extend campaign by 30 days"
                                      >
                                        +30d
                                      </button>
                                      <button
                                        onClick={() => handleDeactivateCampaign(p._id)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Terminate Sponsorship"
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {cStatus === 'expired' && (
                                    <Link
                                      href="/admin/projects"
                                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#029bba] hover:underline"
                                    >
                                      <span>Renew</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </Link>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}