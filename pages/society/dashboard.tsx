// pages/society/dashboard.tsx
// Highrise.pk — Society Dashboard
// Overview stats: blocks, plots, availability, installment plans
// Application status awareness | recharts bar chart
// NO framer-motion | NO as any | NO ui/Card | NO toast

import { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Layers,
  Building2,
  CheckCircle,
  BarChart3,
  FileText,
  MapPin,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Home,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import SocietyLayout from '@/components/society/SocietyLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlotInventoryEntry {
  size: string;
  totalPlots: number;
  availablePlots: number;
  pricePerMarla?: number;
  pricePerSqFt?: number;
}

interface BlockEntry {
  _id: string;
  name: string;
  totalPlots: number;
  availablePlots: number;
  possessionStatus: 'announced' | 'under_development' | 'ready';
  plotSizes: string[];
}

interface InstallmentPlan {
  _id: string;
  planName: string;
  durationMonths: number;
  downPaymentPercent: number;
  isInterestFree: boolean;
}

interface KycDocument {
  _id: string;
  type: string;
  title: string;
}

interface SocietyProfileData {
  societyName: string;
  city: string;
  areaName: string;
  authority: string;
  status: string;
  kycStatus: string;
  trustScore: number;
  nocVerified: boolean;
  cnicVerified: boolean;
  blocks: BlockEntry[];
  plotInventory: PlotInventoryEntry[];
  installmentPlans: InstallmentPlan[];
  kycDocuments: KycDocument[];
  amenities: string[];
  submittedAt?: string;
  verifiedAt?: string;
}

interface ProfileApiResponse {
  success: boolean;
  profile?: SocietyProfileData;
  message?: string;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  iconColor: string;
  href?: string;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
  href,
}: StatCardProps): ReactElement {
  const inner = (
    <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 h-full">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {href && (
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] transition-colors" />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Plot size label map ──────────────────────────────────────────────────────

const PLOT_SIZE_LABELS: Record<string, string> = {
  '3_marla': '3 Marla',
  '4_marla': '4 Marla',
  '5_marla': '5 Marla',
  '6_marla': '6 Marla',
  '7_marla': '7 Marla',
  '8_marla': '8 Marla',
  '10_marla': '10 Marla',
  '12_marla': '12 Marla',
  '1_kanal': '1 Kanal',
  '1_kanal_4_marla': '1 Kanal 4 M',
  '2_kanal': '2 Kanal',
  commercial: 'Commercial',
  other: 'Other',
};

const POSSESSION_LABELS: Record<string, string> = {
  announced: 'Announced',
  under_development: 'Under Development',
  ready: 'Possession Ready',
};

const POSSESSION_COLORS: Record<string, string> = {
  announced: 'bg-blue-50 text-blue-700 border-blue-200',
  under_development: 'bg-amber-50 text-amber-700 border-amber-200',
  ready: 'bg-green-50 text-green-700 border-green-200',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocietyDashboard(): ReactElement {
  const [profile, setProfile] = useState<SocietyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/society/profile', { credentials: 'include' });
      const data = (await res.json()) as ProfileApiResponse;
      if (!res.ok || !data.success) {
        setError(data.message ?? 'Failed to load society profile.');
        return;
      }
      setProfile(data.profile ?? null);
      setError('');
    } catch {
      setError('Network error. Please try again.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SocietyLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading your dashboard...</p>
          </div>
        </div>
      </SocietyLayout>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !profile) {
    return (
      <SocietyLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {error || 'Profile not found'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              If you just submitted your onboarding, your profile may still be processing.
            </p>
            <button
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </SocietyLayout>
    );
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalPlots = profile.blocks.reduce((s, b) => s + b.totalPlots, 0);
  const availablePlots = profile.blocks.reduce((s, b) => s + b.availablePlots, 0);
  const soldPlots = totalPlots - availablePlots;
  const availabilityPct = totalPlots > 0 ? Math.round((availablePlots / totalPlots) * 100) : 0;

  // Chart data: plot inventory by size
  const chartData = profile.plotInventory.map((p) => ({
    name: PLOT_SIZE_LABELS[p.size] ?? p.size,
    total: p.totalPlots,
    available: p.availablePlots,
    sold: p.totalPlots - p.availablePlots,
  }));

  const isApproved = profile.status === 'approved';

  return (
    <>
      <Head>
        <title>{profile.societyName} — Society Dashboard | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <SocietyLayout>
        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.societyName}
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {profile.areaName}, {profile.city}
                <span className="text-gray-300">·</span>
                {profile.authority}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Trust score */}
              {isApproved && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#029bba]/10 border border-[#029bba]/20 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-[#029bba]" />
                  <span className="text-sm font-semibold text-[#004063]">
                    Trust Score: {profile.trustScore}/100
                  </span>
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:border-[#029bba] hover:text-[#029bba] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Building2 className="w-5 h-5" />}
            label="Total Blocks"
            value={profile.blocks.length}
            sub={`${profile.blocks.filter((b) => b.possessionStatus === 'ready').length} possession ready`}
            iconBg="bg-[#029bba]/10"
            iconColor="text-[#029bba]"
            href="/society/blocks"
          />
          <StatCard
            icon={<Layers className="w-5 h-5" />}
            label="Total Plots"
            value={totalPlots.toLocaleString()}
            sub={`${profile.plotInventory.length} size categories`}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            href="/society/plots"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Available Plots"
            value={availablePlots.toLocaleString()}
            sub={`${availabilityPct}% available`}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            href="/society/plots"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Sold / Reserved"
            value={soldPlots.toLocaleString()}
            sub={`${totalPlots > 0 ? Math.round((soldPlots / totalPlots) * 100) : 0}% absorbed`}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        {/* ── Second row stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Installment Plans"
            value={profile.installmentPlans.length}
            sub={`${profile.installmentPlans.filter((p) => p.isInterestFree).length} interest-free`}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="KYC Documents"
            value={profile.kycDocuments.length}
            sub={isApproved ? 'Verified by Highrise' : 'Under review'}
            iconBg="bg-[#029bba]/10"
            iconColor="text-[#029bba]"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Amenities"
            value={profile.amenities.length}
            sub="Listed amenities"
            iconBg="bg-green-50"
            iconColor="text-green-600"
            href="/society/profile"
          />
          <StatCard
            icon={<ShieldCheck className="w-5 h-5" />}
            label="NOC Status"
            value={profile.nocVerified ? 'Verified' : 'Pending'}
            sub={profile.cnicVerified ? 'CNIC verified' : 'CNIC pending'}
            iconBg={profile.nocVerified ? 'bg-green-50' : 'bg-amber-50'}
            iconColor={profile.nocVerified ? 'text-green-600' : 'text-amber-600'}
          />
        </div>

        {/* ── Plot availability chart + Blocks list ── */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          {/* Chart */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">
                Plot Availability by Size
              </h2>
              <Link
                href="/society/plots"
                className="text-xs text-[#029bba] font-medium hover:underline flex items-center gap-1"
              >
                Manage
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Layers className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No plot inventory added yet.</p>
                <Link
                  href="/society/plots"
                  className="mt-2 text-xs text-[#029bba] font-semibold hover:underline"
                >
                  Add Plot Inventory →
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="available" name="Available" fill="#029bba" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sold" name="Sold/Reserved" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Blocks summary */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">
                Blocks & Phases
              </h2>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                {profile.blocks.length} total
              </span>
            </div>

            {profile.blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <MapPin className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No blocks defined yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {profile.blocks.map((block) => {
                  const avail = block.totalPlots > 0
                    ? Math.round((block.availablePlots / block.totalPlots) * 100)
                    : 0;
                  return (
                    <div
                      key={block._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {block.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {block.availablePlots.toLocaleString()} / {block.totalPlots.toLocaleString()} available
                          <span className="ml-1 text-gray-400">({avail}%)</span>
                        </p>
                      </div>
                      <span
                        className={`ml-3 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          POSSESSION_COLORS[block.possessionStatus] ?? 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        {POSSESSION_LABELS[block.possessionStatus] ?? block.possessionStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Installment Plans ── */}
        {profile.installmentPlans.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Installment Plans
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profile.installmentPlans.map((plan) => (
                <div
                  key={plan._id}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <p className="text-sm font-semibold text-gray-800 mb-2 truncate">
                    {plan.planName}
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>
                      Duration:{' '}
                      <span className="font-medium text-gray-700">
                        {plan.durationMonths >= 12
                          ? `${Math.round(plan.durationMonths / 12)} Year${Math.round(plan.durationMonths / 12) !== 1 ? 's' : ''}`
                          : `${plan.durationMonths} Months`}
                      </span>
                    </p>
                    <p>
                      Down Payment:{' '}
                      <span className="font-medium text-gray-700">
                        {plan.downPaymentPercent}%
                      </span>
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        plan.isInterestFree
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {plan.isInterestFree ? '✓ Interest Free' : 'With Interest'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/society/profile">
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all duration-200 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 flex items-center justify-center mb-3 group-hover:bg-[#029bba] transition-colors">
                <Building2 className="w-5 h-5 text-[#029bba] group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-gray-800 group-hover:text-[#029bba] transition-colors text-sm">
                Update Profile
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Edit contact info, amenities & more
              </p>
            </div>
          </Link>

          <Link href="/society/plots">
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all duration-200 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-[#029bba] transition-colors">
                <Layers className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-gray-800 group-hover:text-[#029bba] transition-colors text-sm">
                Manage Plots
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Update inventory & pricing
              </p>
            </div>
          </Link>

          <Link href="/contact">
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all duration-200 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-3 group-hover:bg-[#029bba] transition-colors">
                <Home className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <p className="font-semibold text-gray-800 group-hover:text-[#029bba] transition-colors text-sm">
                Get Support
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Contact Highrise.pk team
              </p>
            </div>
          </Link>
        </div>
      </SocietyLayout>
    </>
  );
}