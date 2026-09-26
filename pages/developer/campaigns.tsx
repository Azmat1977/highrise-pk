// pages/developer/campaigns.tsx
// --- PORTAL CAMPAIGNS & MONETIZATION DASHBOARD ---
// Secure | Role-Guarded | Reusable Shell | 100% Pure ASCII

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import {
  Star,
  Eye,
  MousePointerClick,
  Percent,
  RefreshCw,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  BadgeAlert,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface CampaignRow {
  _id: string;
  slug?: string;
  projectName: string;
  city: string;
  area: string;
  isFeatured: boolean;
  promotionStartDate: string | null;
  promotionEndDate: string | null;
  promotionImpressions: number;
  promotionClicks: number;
  primaryImage: string | null;
}

export default function DeveloperCampaignsPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth Guard Enforcer
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || (session.user as { role?: string })?.role !== 'developer') {
      void router.replace('/login?redirect=/developer/campaigns');
    }
  }, [session, authStatus, router]);

  // Fetch Campaigns API
  const fetchCampaigns = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/developer/campaigns', {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
      } else {
        setError(data.message ?? 'Failed to retrieve active campaigns.');
      }
    } catch {
      setError('A network failure occurred. Please reload campaign dashboards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session && (session.user as { role?: string })?.role === 'developer') {
      fetchCampaigns();
    }
  }, [session, fetchCampaigns]);

  // Campaign Lifespan Analytics
  const getCampaignStatus = (p: CampaignRow): 'active' | 'upcoming' | 'expired' => {
    if (!p.isFeatured) return 'expired';
    const now = new Date();
    const start = p.promotionStartDate ? new Date(p.promotionStartDate) : null;
    const end = p.promotionEndDate ? new Date(p.promotionEndDate) : null;

    if (start && now < start) return 'upcoming';
    if (end && now > end) return 'expired';
    return 'active';
  };

  const getDaysRemaining = (p: CampaignRow): number => {
    if (!p.promotionEndDate) return 0;
    const diff = new Date(p.promotionEndDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Aggregated KPI Stats
  const activeCampaigns = campaigns.filter((c) => getCampaignStatus(c) === 'active');
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.promotionImpressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.promotionClicks, 0);
  const avgCTR =
    totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-semibold">Authorizing credentials...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== 'developer') return <div />;

  return (
    <>
      <Head>
        <title>Sponsorship Reports &amp; Analytics - Developer Portal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <DeveloperLayout>
        <div className="space-y-6 pb-12">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-black text-[#004063] tracking-tight flex items-center gap-2">
                <Star className="w-5 h-5 text-[#029bba] fill-[#029bba]" />
                <span>Sponsored Campaigns &amp; Placements</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Verify performance traffic, impression stats, and real-time CTR reports
              </p>
            </div>

            <button
              onClick={() => fetchCampaigns(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-gray-900">{activeCampaigns.length}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Active Ads</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 flex items-center justify-center text-[#029bba] shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-gray-900">{totalImpressions.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Impressions</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-gray-900">{totalClicks.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Clicks</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-gray-900">{avgCTR}%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Avg CTR</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Detailed Table Grid */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-150">
                <h3 className="font-bold text-sm text-[#004063]">Campaign Breakdown</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Real-time statistics per development</p>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-xs font-semibold">Aggregating real-time telemetry...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center text-red-500 font-semibold text-xs">{error}</div>
              ) : campaigns.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-gray-50 border rounded-xl flex items-center justify-center mx-auto text-gray-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">No sponsorships activated yet</p>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                    Contact your Highrise.pk account partner to activate premier listings, Slot #3 injections, and featured home badges.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Project</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-center">Impressions</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-center">Clicks</th>
                        <th className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-center">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {campaigns.map((c) => {
                        const status = getCampaignStatus(c);
                        const remDays = getDaysRemaining(c);
                        const ctr = c.promotionImpressions > 0 ? ((c.promotionClicks / c.promotionImpressions) * 100).toFixed(2) : '0.00';

                        return (
                          <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                                  {c.primaryImage ? (
                                    <img src={c.primaryImage} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#029bba]">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 truncate max-w-[150px]">{c.projectName}</p>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{c.area || c.city}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {status === 'expired' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold">
                                  Lapsed
                                </span>
                              ) : status === 'upcoming' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold">
                                  Scheduled
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold">
                                    Active
                                  </span>
                                  <p className="text-[9px] text-gray-400 font-semibold">
                                    {remDays} days left
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center font-bold text-gray-700">
                              {c.promotionImpressions.toLocaleString()}
                            </td>

                            <td className="px-4 py-3 text-center font-bold text-gray-700">
                              {c.promotionClicks.toLocaleString()}
                            </td>

                            <td className="px-4 py-3 text-center font-black text-[#029bba]">
                              {ctr}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Campaign renewal sidebar CTA */}
            <div className="space-y-4">
              <div className="bg-gradient-to-b from-[#004063] to-[#002840] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
                  <Star className="w-40 h-40 fill-white" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5 fill-current" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-black text-sm tracking-tight">Need More Traffic?</h4>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Upgrade to premium slots, extend duration campaigns, or target premium cities in Pakistan to accelerate bookings.
                    </p>
                  </div>

                  <div className="pt-2">
                    <a
                      href="https://wa.me/923000000000?text=Hi%20Highrise,%20I%2527d%20like%20to%20extend%20and%20upgrade%20my%20sponsorship%20campaigns%20on%20Highrise.pk!"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-xs font-bold transition-all shadow-md shadow-[#029bba]/10"
                    >
                      <span>Renew / Extend Ads</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Informational Help Grid */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5">
                <h4 className="font-bold text-xs text-[#004063] uppercase tracking-wider">Placement FAQ</h4>

                <div className="space-y-2.5 text-[11px] text-gray-600">
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#029bba]" />
                      <span>How often do impressions update?</span>
                    </p>
                    <p className="leading-relaxed pl-5 text-gray-400">
                      Impressions sync in real-time as verified buyers scroll across promoted listings in city grids.
                    </p>
                  </div>

                  <div className="space-y-0.5 pt-2 border-t border-gray-100">
                    <p className="font-bold text-gray-900 flex items-center gap-1.5">
                      <BadgeAlert className="w-3.5 h-3.5 text-[#029bba]" />
                      <span>What is a healthy CTR?</span>
                    </p>
                    <p className="leading-relaxed pl-5 text-gray-400">
                      Standard industry vertical CTR ranges from 1.5% to 3.0%. CTRs over 4.5% indicate stellar image previews and taglines.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DeveloperLayout>
    </>
  );
}