// pages/developer/dashboard.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER DASHBOARD — Highrise.pk V6.4.5
// Enterprise-grade portal dashboard with full information hierarchy.
// ═══════════════════════════════════════════════════════════════
// ✅ 4-layer information hierarchy
// ✅ Welcome header + trust score badge + public profile CTA
// ✅ Profile completion banner (< 100%)
// ✅ 8 stat cards (4 primary + 4 secondary) with click-navigate
// ✅ Projects funnel chart (recharts BarChart)
// ✅ Badges showcase (12 developer badge types)
// ✅ Recent projects table (with thumbnails + hover actions)
// ✅ Recent leads table (with contact icons + null-safe)
// ✅ 3 Quick Action cards
// ✅ No duplicate status banners (Layout handles them)
// ✅ Graceful API degradation
// ✅ Empty states with actionable CTAs
// ✅ fetch() only — no apiClient
// ✅ No banned patterns
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Building2,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit,
  FolderOpen,
  Users,
  TrendingUp,
  Star,
  Award,
  Shield,
  Zap,
  Phone,
  Mail,
  AlertCircle,
  XCircle,
  ChevronRight,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import DeveloperLayout from "@/components/developer/DeveloperLayout";
import { useDeveloperContext } from "@/components/developer/DeveloperContext";
import type { DeveloperBadge } from "@/components/developer/DeveloperContext";

// ============================================
// TYPES
// ============================================

interface ProjectSummary {
  _id: string;
  slug?: string;
  projectName: string;
  city: string;
  areaName?: string;
  area?: string;
  projectCategory?: string;
  verificationStatus?: string;
  status?: string;
  featureImageUrl?: string;
  primaryImage?: string;
  unitCount?: number;
  createdAt?: string;
}

interface LeadSummary {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  priority: string;
  leadScore?: number;
  createdAt: string;
  projectSnapshot?: {
    projectName?: string;
    city?: string;
  };
}

interface ProjectsApiResponse {
  success: boolean;
  projects?: ProjectSummary[];
  message?: string;
}

interface LeadsApiResponse {
  success: boolean;
  data?: LeadSummary[];
  message?: string;
}

// ============================================
// BADGE CONFIGURATION (12 types)
// ============================================

interface BadgeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  description: string;
}

const BADGE_CONFIG: Record<DeveloperBadge, BadgeConfig> = {
  startup: {
    label: "Startup",
    icon: Zap,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    description: "New developer on platform",
  },
  emerging: {
    label: "Emerging",
    icon: TrendingUp,
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    description: "1–2 completed projects",
  },
  established: {
    label: "Established",
    icon: Building2,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "3–5 completed projects",
  },
  silver: {
    label: "Silver",
    icon: Award,
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-300",
    description: "6–10 completed projects",
  },
  gold: {
    label: "Gold",
    icon: Award,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    description: "11–20 completed projects",
  },
  platinum: {
    label: "Platinum",
    icon: Award,
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-300",
    description: "21–50 completed projects",
  },
  diamond: {
    label: "Diamond",
    icon: Star,
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    description: "51+ completed projects",
  },
  highrise_verified: {
    label: "Highrise Verified",
    icon: Shield,
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    description: "Site verified + KYC complete",
  },
  top_developer: {
    label: "Top Developer",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: "Top 10% in city",
  },
  trusted_builder: {
    label: "Trusted Builder",
    icon: CheckCircle2,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    description: "4.5+ rating, 50+ reviews",
  },
  on_time_delivery: {
    label: "On-Time Delivery",
    icon: Clock,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    description: "90%+ on-time delivery rate",
  },
  premium_partner: {
    label: "Premium Partner",
    icon: Star,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    description: "Active premium subscription",
  },
};

// ============================================
// HELPERS — null-safe
// ============================================

function getProjectLocation(p: ProjectSummary): string {
  const area = p.areaName ?? p.area ?? "";
  if (area && p.city) return `${area}, ${p.city}`;
  return p.city ?? area ?? "—";
}

function getProjectImage(p: ProjectSummary): string | null {
  return p.featureImageUrl ?? p.primaryImage ?? null;
}

function getProjectStatus(p: ProjectSummary): string {
  return p.verificationStatus ?? p.status ?? "pending";
}

function getLeadEntityName(lead: LeadSummary): string {
  return lead.projectSnapshot?.projectName ?? "—";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700 border-green-200",
    verified: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    suspended: "bg-orange-100 text-orange-700 border-orange-200",
  };

  const labels: Record<string, string> = {
    approved: "Approved",
    verified: "Verified",
    pending: "Pending",
    rejected: "Rejected",
    draft: "Draft",
    suspended: "Suspended",
  };

  const key = status.toLowerCase();
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
        styles[key] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {labels[key] ?? status}
    </span>
  );
}

// ============================================
// LEAD PRIORITY BADGE
// ============================================

function PriorityBadge({
  priority,
}: {
  priority: string;
}): React.ReactElement {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const key = priority.toLowerCase();
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
        styles[key] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {priority}
    </span>
  );
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  sub?: string;
  subColor?: string;
  href?: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  sub,
  subColor = "text-gray-500",
  href,
}: StatCardProps): React.ReactElement {
  const content = (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold truncate">
          {label}
        </p>
        <p className="text-2xl font-black text-[#004063] leading-tight">
          {value}
        </p>
        {sub && (
          <p className={`text-xs mt-0.5 font-medium ${subColor}`}>{sub}</p>
        )}
      </div>
      {href && (
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ============================================
// DASHBOARD SKELETON
// ============================================

function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="pb-12 bg-[#f8f9fa] min-h-screen animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome skeleton */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="h-8 bg-gray-200 rounded-xl w-64 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-2xl"
            />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="h-72 bg-gray-200 rounded-2xl" />
        {/* Tables skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// TRUST SCORE PILL
// ============================================

function TrustScorePill({
  score,
}: {
  score: number;
}): React.ReactElement {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 40
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${color}`}
    >
      <Shield className="w-3.5 h-3.5" />
      Trust Score: {score}/100
    </div>
  );
}

// ============================================
// MAIN DASHBOARD CONTENT
// ============================================

function DashboardContent(): React.ReactElement {
  const { profile, profileCompletion, stats, isLoading, error } =
    useDeveloperContext();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // ── Fetch recent projects ─────────────────────────────────
  const fetchRecentProjects = useCallback(async (): Promise<void> => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch("/api/developer/projects?limit=5", {
        credentials: "include",
      });
      const data = (await res.json()) as ProjectsApiResponse;
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects.slice(0, 5));
      } else {
        setProjects([]);
      }
    } catch {
      setProjectsError("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // ── Fetch recent leads ────────────────────────────────────
  const fetchRecentLeads = useCallback(async (): Promise<void> => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const res = await fetch(
        "/api/leads?limit=5&sortBy=createdAt&sortOrder=desc",
        { credentials: "include" }
      );
      const data = (await res.json()) as LeadsApiResponse;
      if (data.success && Array.isArray(data.data)) {
        setLeads(data.data.slice(0, 5));
      } else {
        setLeads([]);
      }
    } catch {
      setLeadsError("Failed to load leads");
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecentProjects();
    void fetchRecentLeads();
  }, [fetchRecentProjects, fetchRecentLeads]);

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) return <DashboardSkeleton />;

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-100 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-bold text-[#004063] mb-2">
            Failed to load dashboard
          </h3>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-semibold hover:bg-[#027a94] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.companyName ?? "Developer";
  const trustScore = profile?.trustScore?.overall ?? 0;
  const isApproved = profile?.status === "approved";
  const badges = profile?.badges ?? [];

  // ── Leads funnel chart data ───────────────────────────────
  const chartData = [
    {
      stage: "New",
      count: stats.newLeads,
      fill: "#029bba",
    },
    {
      stage: "Active",
      count: stats.totalLeads - stats.newLeads - stats.wonLeads,
      fill: "#f59e0b",
    },
    {
      stage: "Won",
      count: stats.wonLeads,
      fill: "#10b981",
    },
    {
      stage: "Projects",
      count: stats.totalProjects,
      fill: "#6366f1",
    },
    {
      stage: "Completed",
      count: profile?.completedProjectsCount ?? 0,
      fill: "#8b5cf6",
    },
  ].filter((d) => d.count >= 0);

  // ── Quick action cards ────────────────────────────────────
  const quickActions = [
    {
      title: "Add New Project",
      description: "List a new development project",
      icon: Plus,
      iconBg: "bg-[#029bba]",
      href: "/developer/projects/new",
      disabled: !isApproved,
      disabledReason: "Approval required",
    },
    {
      title: "Manage Leads",
      description: "View and respond to inquiries",
      icon: Users,
      iconBg: "bg-emerald-500",
      href: "/developer/leads",
      disabled: false,
    },
    {
      title: "View Analytics",
      description: "Track performance metrics",
      icon: TrendingUp,
      iconBg: "bg-violet-500",
      href: "/developer/analytics",
      disabled: false,
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — Highrise.pk Developer Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="pb-16 bg-[#f8f9fa] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          {/* ══════════════════════════════════════════════════
              LAYER 1 — Welcome Header
          ══════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shrink-0 shadow-sm">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-[#004063] leading-tight">
                        Welcome back,{" "}
                        <span className="text-[#029bba]">{displayName}</span>
                      </h1>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Developer Portal Dashboard
                      </p>
                    </div>
                  </div>

                  {/* Trust score pill */}
                  {trustScore > 0 && (
                    <div className="mt-3">
                      <TrustScorePill score={trustScore} />
                    </div>
                  )}
                </div>

                {/* Right — CTAs */}
                <div className="flex items-center gap-2 shrink-0">
                  {isApproved && profile?.slug && (
                    <Link
                      href={`/developers/${profile.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 hover:border-[#029bba] text-sm font-semibold text-[#666666] hover:text-[#029bba] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Public Profile
                    </Link>
                  )}
                  {isApproved && (
                    <Link
                      href="/developer/projects/new"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-semibold shadow-md shadow-[#029bba]/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Profile completion banner — inside welcome card */}
            {profileCompletion < 100 && (
              <div className="border-t border-gray-100 px-6 py-4 bg-gradient-to-r from-[#029bba]/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-[#004063]">
                        Profile Completion
                      </p>
                      <span className="text-sm font-black text-[#029bba]">
                        {profileCompletion}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-[#029bba] rounded-full transition-all duration-700"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href="/developer/profile"
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#029bba]/10 hover:bg-[#029bba]/20 text-[#029bba] text-sm font-semibold transition-colors"
                  >
                    Complete Profile
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              LAYER 2 — 8 Stat Cards
          ══════════════════════════════════════════════════ */}

          {/* Primary stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Projects"
              value={stats.totalProjects}
              icon={FolderOpen}
              iconBg="bg-[#029bba]/10"
              iconColor="text-[#029bba]"
              sub="All time"
              href="/developer/projects"
            />
            <StatCard
              label="Active Projects"
              value={stats.activeProjects}
              icon={Building2}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              sub="Live on platform"
              subColor="text-emerald-600"
              href="/developer/projects"
            />
            <StatCard
              label="Total Leads"
              value={stats.totalLeads}
              icon={Users}
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              sub="All inquiries"
              href="/developer/leads"
            />
            <StatCard
              label="New Leads"
              value={stats.newLeads}
              icon={AlertCircle}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              sub="Need attention"
              subColor="text-amber-600"
              href="/developer/leads"
            />
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Completed"
              value={profile?.completedProjectsCount ?? 0}
              icon={CheckCircle2}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              sub="Delivered projects"
              subColor="text-green-600"
            />
            <StatCard
              label="Won Leads"
              value={stats.wonLeads}
              icon={TrendingUp}
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
              sub="Converted deals"
              subColor="text-teal-600"
            />
            <StatCard
              label="Avg Rating"
              value={
                profile?.averageRating
                  ? `${profile.averageRating.toFixed(1)} ★`
                  : "—"
              }
              icon={Star}
              iconBg="bg-yellow-100"
              iconColor="text-yellow-600"
              sub={
                profile?.totalReviews
                  ? `${profile.totalReviews} reviews`
                  : "No reviews yet"
              }
            />
            <StatCard
              label="Profile Views"
              value={profile?.profileViews ?? 0}
              icon={Eye}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              sub="All time views"
            />
          </div>

          {/* ══════════════════════════════════════════════════
              LAYER 3A — Projects Funnel Chart
          ══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Chart */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#004063]">
                    Pipeline Overview
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Projects and leads funnel
                  </p>
                </div>
                <Link
                  href="/developer/analytics"
                  className="text-xs font-semibold text-[#029bba] hover:underline flex items-center gap-1"
                >
                  Full Analytics
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-6">
                {chartData.every((d) => d.count === 0) ? (
                  <div className="h-48 flex flex-col items-center justify-center">
                    <LayoutDashboard className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-400">
                      No data yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add projects to see your pipeline
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0f0f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="stage"
                        tick={{
                          fontSize: 11,
                          fill: "#666666",
                          fontWeight: 600,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#666666" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                          fontSize: "12px",
                        }}
                        cursor={{ fill: "rgba(2,155,186,0.05)" }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Badges showcase */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-base font-bold text-[#004063]">
                  Achievements
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your earned badges
                </p>
              </div>
              <div className="p-5">
                {badges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Award className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-400 text-center">
                      No badges yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      Complete projects to earn badges
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge) => {
                      const cfg = BADGE_CONFIG[badge];
                      if (!cfg) return null;
                      const IconComp = cfg.icon;
                      return (
                        <div
                          key={badge}
                          title={cfg.description}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border} cursor-default`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          {cfg.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Trust score breakdown */}
                {profile?.trustScore && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs font-bold text-[#004063] uppercase tracking-wide mb-3">
                      Trust Score Breakdown
                    </p>
                    <div className="space-y-2">
                      {Object.entries(
                        profile.trustScore.breakdown
                      ).map(([key, val]) => {
                        const maxMap: Record<string, number> = {
                          profileComplete: 15,
                          documentsVerified: 25,
                          siteVerified: 15,
                          customerRatings: 20,
                          projectHistory: 15,
                          onTimeDelivery: 10,
                        };
                        const max = maxMap[key] ?? 10;
                        const pct = Math.round((val / max) * 100);
                        const label = key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase());
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-gray-600 font-medium">
                                {label}
                              </span>
                              <span className="text-[#029bba] font-bold">
                                {val}/{max}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-[#029bba] rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              LAYER 3B — Recent Projects + Recent Leads
          ══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Projects */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#004063]">
                  Recent Projects
                </h2>
                <Link
                  href="/developer/projects"
                  className="text-xs font-semibold text-[#029bba] hover:underline flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {projectsLoading ? (
                <div className="p-6 space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-gray-100 rounded-xl"
                    />
                  ))}
                </div>
              ) : projectsError ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">{projectsError}</p>
                  <button
                    onClick={() => void fetchRecentProjects()}
                    className="mt-2 text-xs font-semibold text-[#029bba] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FolderOpen className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">
                    No projects yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">
                    Your portfolio is empty
                  </p>
                  {isApproved && (
                    <Link
                      href="/developer/projects/new"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#029bba] text-white text-xs font-bold rounded-xl hover:bg-[#027a94] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Project
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {projects.map((p) => {
                    const image = getProjectImage(p);
                    const location = getProjectLocation(p);
                    const status = getProjectStatus(p);
                    return (
                      <div
                        key={p._id}
                        className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image}
                              alt={p.projectName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#004063] truncate">
                            {p.projectName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {location}
                          </p>
                        </div>

                        {/* Status */}
                        <StatusBadge status={status} />

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Link
                            href={`/developer/projects/${p._id}/edit`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#029bba] transition-colors"
                            title="Edit"
                            aria-label="Edit project"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          {p.slug && (
                            <Link
                              href={`/projects/${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#029bba] transition-colors"
                              title="View live"
                              aria-label="View project live"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#004063]">
                  Recent Leads
                </h2>
                <Link
                  href="/developer/leads"
                  className="text-xs font-semibold text-[#029bba] hover:underline flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {leadsLoading ? (
                <div className="p-6 space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-gray-100 rounded-xl"
                    />
                  ))}
                </div>
              ) : leadsError ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">{leadsError}</p>
                  <button
                    onClick={() => void fetchRecentLeads()}
                    className="mt-2 text-xs font-semibold text-[#029bba] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : leads.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">
                    No leads yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Inquiries will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {leads.map((lead) => (
                    <div
                      key={lead._id}
                      className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#004063] truncate">
                          {lead.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {getLeadEntityName(lead)}
                        </p>
                      </div>

                      {/* Priority */}
                      <PriorityBadge priority={lead.priority} />

                      {/* Contact icons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                            title={`Call ${lead.name}`}
                            aria-label={`Call ${lead.name}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title={`Email ${lead.name}`}
                            aria-label={`Email ${lead.name}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          href="/developer/leads"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#029bba] transition-colors"
                          title="View lead"
                          aria-label="View lead"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              LAYER 4 — Quick Actions
          ══════════════════════════════════════════════════ */}
          <div>
            <h2 className="text-base font-bold text-[#004063] mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const IconComp = action.icon;
                if (action.disabled) {
                  return (
                    <div
                      key={action.title}
                      className="bg-white rounded-2xl border border-gray-200 p-5 opacity-60 cursor-not-allowed"
                      title={action.disabledReason}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.iconBg}`}
                      >
                        <IconComp className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-bold text-[#004063]">
                        {action.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {action.disabledReason ?? action.description}
                      </p>
                    </div>
                  );
                }
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#029bba]/30 hover:shadow-md transition-all duration-200 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.iconBg} group-hover:scale-110 transition-transform duration-200`}
                    >
                      <IconComp className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-[#004063] group-hover:text-[#029bba] transition-colors">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ============================================
// PAGE EXPORT
// ============================================

export default function DeveloperDashboard(): React.ReactElement {
  return (
    <DeveloperLayout>
      <DashboardContent />
    </DeveloperLayout>
  );
}