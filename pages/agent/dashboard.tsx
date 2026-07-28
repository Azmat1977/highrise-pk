// ========== FILE: pages/agent/dashboard.tsx ==========
// Agent Dashboard — Enterprise Redesign V6.4.3
// 4-layer hierarchy: Welcome + Completion + Stats + Visualizations + Tables
// Features: trust score, profile completion %, 8 stats, leads funnel chart,
//           badges showcase, recent properties, recent leads, quick actions
// ====================================================

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Plus,
  Eye,
  CheckCircle,
  Users,
  Home,
  ExternalLink,
  Edit,
  Phone,
  Mail,
  Star,
  Shield,
  FolderOpen,
  TrendingUp,
  DollarSign,
  Award,
  MessageSquare,
  BarChart3,
  Target,
  Building2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Crown,
  Medal,
  Sparkles,
} from "lucide-react";
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
import AgentLayout from "@/components/agent/AgentLayout";
import { useAgentContext, type AgentBadge } from "@/components/agent/AgentContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertySummary {
  _id:          string;
  slug?:        string;
  title:        string;
  city:         string;
  society?:     string;
  locality?:    string;
  propertyType: string;
  listingType:  "full_payment" | "installment" | "rent" | "sale";
  status:       string;
  price:        number;
  totalPrice?:  number;
  views?:       number;
  inquiries?:   number;
  images?:      { url: string; isPrimary?: boolean }[];
  featureImageUrl?: string;
  createdAt?:   string;
  verification?: {
    status?: string;
  };
}

interface Lead {
  _id:      string;
  name:     string;
  phone?:   string;
  email?:   string;
  status:   string;
  createdAt: string;
  propertySnapshot?: {
    title?: string;
    city?:  string;
    price?: number;
  };
  projectSnapshot?: {
    projectName?: string;
    city?:        string;
  };
}

interface DashboardStats {
  total:       number;
  active:      number;
  pending:     number;
  rejected:    number;
  totalLeads:  number;
  newLeads:    number;
  wonLeads:    number;
  totalViews:  number;
  conversionRate: number;
}

interface LeadFunnelData {
  stage:   string;
  count:   number;
  color:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} Cr`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(1)} Lac`;
  return price.toLocaleString();
}

function formatCurrency(amount: number): string {
  if (amount >= 10_000_000) return `PKR ${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000)    return `PKR ${(amount / 100_000).toFixed(1)}L`;
  return `PKR ${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Null-safe entity helpers for leads (Aleem AI + property leads may lack fields)
function getLeadEntityName(lead: Lead): string {
  return lead.propertySnapshot?.title
    ?? lead.projectSnapshot?.projectName
    ?? "General Inquiry";
}

// ─── Badge Metadata ───────────────────────────────────────────────────────────

const BADGE_META: Record<AgentBadge, {
  label:    string;
  color:    string;
  bg:       string;
  border:   string;
  icon:     React.ReactElement;
}> = {
  bronze:              { label: "Bronze",             color: "text-amber-700", bg: "bg-amber-50",    border: "border-amber-200",    icon: <Medal className="w-4 h-4" /> },
  silver:              { label: "Silver",             color: "text-gray-600",  bg: "bg-gray-50",     border: "border-gray-200",     icon: <Medal className="w-4 h-4" /> },
  gold:                { label: "Gold",               color: "text-yellow-700",bg: "bg-yellow-50",   border: "border-yellow-200",   icon: <Award className="w-4 h-4" /> },
  platinum:            { label: "Platinum",           color: "text-slate-700", bg: "bg-slate-50",    border: "border-slate-200",    icon: <Crown className="w-4 h-4" /> },
  highrise_verified:   { label: "Highrise Verified",  color: "text-[#029bba]", bg: "bg-[#029bba]/10",border: "border-[#029bba]/20", icon: <ShieldCheck className="w-4 h-4" /> },
  top_performer:       { label: "Top Performer",      color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",  icon: <TrendingUp className="w-4 h-4" /> },
  quick_responder:     { label: "Quick Responder",    color: "text-blue-700",  bg: "bg-blue-50",     border: "border-blue-200",     icon: <Zap className="w-4 h-4" /> },
  customer_choice:     { label: "Customer Choice",    color: "text-pink-700",  bg: "bg-pink-50",     border: "border-pink-200",     icon: <Sparkles className="w-4 h-4" /> },
  premium_member:      { label: "Premium Member",     color: "text-violet-700",bg: "bg-violet-50",   border: "border-violet-200",   icon: <Crown className="w-4 h-4" /> },
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

type StatColor = "teal" | "green" | "purple" | "amber" | "blue" | "rose" | "indigo" | "orange";

const STAT_COLORS: Record<StatColor, { bg: string; iconBg: string; iconColor: string; text: string }> = {
  teal:   { bg: "bg-[#029bba]/5",   iconBg: "bg-[#029bba]/10", iconColor: "text-[#029bba]",  text: "text-[#029bba]" },
  green:  { bg: "bg-emerald-50",    iconBg: "bg-emerald-100",  iconColor: "text-emerald-600",text: "text-emerald-700" },
  purple: { bg: "bg-violet-50",     iconBg: "bg-violet-100",   iconColor: "text-violet-600", text: "text-violet-700" },
  amber:  { bg: "bg-amber-50",      iconBg: "bg-amber-100",    iconColor: "text-amber-600",  text: "text-amber-700" },
  blue:   { bg: "bg-blue-50",       iconBg: "bg-blue-100",     iconColor: "text-blue-600",   text: "text-blue-700" },
  rose:   { bg: "bg-rose-50",       iconBg: "bg-rose-100",     iconColor: "text-rose-600",   text: "text-rose-700" },
  indigo: { bg: "bg-indigo-50",     iconBg: "bg-indigo-100",   iconColor: "text-indigo-600", text: "text-indigo-700" },
  orange: { bg: "bg-orange-50",     iconBg: "bg-orange-100",   iconColor: "text-orange-600", text: "text-orange-700" },
};

interface StatCardProps {
  label:      string;
  value:      number | string;
  icon:       React.ReactNode;
  color:      StatColor;
  subLabel?:  string;
  href?:      string;
}

function StatCard({ label, value, icon, color, subLabel, href }: StatCardProps): React.ReactElement {
  const c = STAT_COLORS[color];

  const inner = (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium truncate uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-0.5">{value}</p>
        {subLabel && (
          <p className={`text-xs font-semibold mt-0.5 ${c.text}`}>{subLabel}</p>
        )}
      </div>
      {href && (
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block hover:opacity-95 transition-opacity">{inner}</Link>;
  }
  return inner;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

type StatusKey =
  | "approved" | "active" | "pending" | "rejected" | "draft"
  | "new" | "contacted" | "qualified" | "site_visit_scheduled"
  | "proposal_sent" | "negotiation" | "won" | "lost" | "nurture" | "suspended"
  | "verified" | "under_review" | "flagged";

const STATUS_STYLES: Record<StatusKey, string> = {
  approved:              "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  active:                "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  verified:              "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pending:               "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  under_review:          "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  rejected:              "bg-red-50 text-red-700 ring-1 ring-red-200",
  draft:                 "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  new:                   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  contacted:             "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  qualified:             "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  site_visit_scheduled:  "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  proposal_sent:         "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  negotiation:           "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  won:                   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  lost:                  "bg-red-50 text-red-700 ring-1 ring-red-200",
  nurture:               "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  suspended:             "bg-red-50 text-red-700 ring-1 ring-red-200",
  flagged:               "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
};

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const style = STATUS_STYLES[status as StatusKey] ?? STATUS_STYLES.draft;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyProperties(): React.ReactElement {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
        <Home className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-base font-bold text-gray-900">No Properties Yet</h3>
      <p className="text-sm text-gray-500 mt-1 mb-5 max-w-xs mx-auto">
        Start listing your properties to reach thousands of buyers on Highrise.pk.
      </p>
      <Link
        href="/add-property"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-colors bg-[#029bba] hover:bg-[#027a94]"
      >
        <Plus className="w-4 h-4" />
        Add Your First Property
      </Link>
    </div>
  );
}

function EmptyLeads(): React.ReactElement {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
        <Users className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-base font-bold text-gray-900">No Leads Yet</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
        When clients inquire about your properties, their leads will appear here.
      </p>
    </div>
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent(): React.ReactElement {
  const { data: session }                          = useSession();
  const { profile, profileLoading, profileCompletion } = useAgentContext();

  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats>({
    total: 0, active: 0, pending: 0, rejected: 0,
    totalLeads: 0, newLeads: 0, wonLeads: 0,
    totalViews: 0, conversionRate: 0,
  });

  const [leadFunnel, setLeadFunnel] = useState<LeadFunnelData[]>([]);

  // ── Fetch dashboard data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Properties fetch
      try {
        const res = await fetch("/api/properties/my-properties?limit=5", {
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as {
            success?: boolean;
            properties?: PropertySummary[];
            stats?: { total?: number; byStatus?: Record<string, number> };
          };
          const props = data.properties ?? [];
          setProperties(props);

          // Use API stats if available
          const s     = data.stats;
          const byStatus = s?.byStatus ?? {};
          const total    = s?.total ?? props.length;
          const active   = (byStatus.verified ?? 0) + (byStatus.approved ?? 0);
          const pending  = (byStatus.pending  ?? 0) + (byStatus.under_review ?? 0);
          const rejected = byStatus.rejected  ?? 0;
          const totalViews = props.reduce((sum, p) => sum + (p.views ?? 0), 0);

          setStats((prev) => ({
            ...prev,
            total, active, pending, rejected, totalViews,
          }));
        }
      } catch {
        // Graceful degradation
      }

      // Leads fetch
      try {
        const res = await fetch("/api/leads?limit=5", {
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as {
            success: boolean;
            data?: Lead[];
            stats?: {
              all?: number; new?: number; contacted?: number; qualified?: number;
              site_visit_scheduled?: number; won?: number; lost?: number;
              conversionRate?: number;
            };
            pagination?: { total?: number };
          };
          if (data.success) {
            const fetchedLeads = data.data ?? [];
            setLeads(fetchedLeads);
            const s = data.stats ?? {};

            setStats((prev) => ({
              ...prev,
              totalLeads:     data.pagination?.total ?? s.all ?? 0,
              newLeads:       s.new ?? 0,
              wonLeads:       s.won ?? 0,
              conversionRate: s.conversionRate ?? 0,
            }));

            // Build funnel data
            setLeadFunnel([
              { stage: "New",       count: s.new       ?? 0, color: "#3b82f6" },
              { stage: "Contacted", count: s.contacted ?? 0, color: "#8b5cf6" },
              { stage: "Qualified", count: s.qualified ?? 0, color: "#f97316" },
              { stage: "Visit",     count: s.site_visit_scheduled ?? 0, color: "#6366f1" },
              { stage: "Won",       count: s.won       ?? 0, color: "#10b981" },
            ]);
          }
        }
      } catch {
        // Graceful degradation
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const userName = profile?.displayName ?? session?.user?.name ?? "Agent";
  const trustScore = profile?.trustScore?.overall ?? 0;
  const isApproved = profile?.status === "approved";
  const publicProfileUrl = profile?.slug ? `/agent/${profile.slug}` : null;

  // Rating stats
  const avgRating    = profile?.ratings?.averageRating ?? 0;
  const totalReviews = profile?.ratings?.totalReviews  ?? 0;

  // Response stats
  const responseRate = profile?.stats?.responseRate  ?? 0;
  const totalDeals   = (profile?.experience?.totalDeals ?? 0);

  // Badges
  const badges = profile?.badges ?? [];

  return (
    <div className="p-4 md:p-6 pb-12">

      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#029bba]" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back,{" "}
            <span className="font-bold text-gray-800">{userName}</span>
            {isApproved && trustScore > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700">
                <ShieldCheck className="w-3 h-3" />
                Trust Score: {trustScore}/100
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {publicProfileUrl && isApproved && (
            <a
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#029bba]/20 bg-[#029bba]/5 text-[#029bba] text-sm font-semibold hover:bg-[#029bba]/10 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Public Profile
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* ── 2. PROFILE COMPLETION BANNER (< 100%) ────────────────────────── */}
      {!profileLoading && profileCompletion < 100 && (
        <div className="mb-6 bg-gradient-to-r from-[#029bba]/5 to-[#029bba]/10 border border-[#029bba]/20 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#029bba]/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-[#029bba]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#004063] text-sm">
                  Complete Your Profile
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  You&apos;re {100 - profileCompletion}% away from a fully verified profile.
                  Complete profiles get 3× more leads.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white rounded-full overflow-hidden max-w-xs">
                    <div
                      className="h-full bg-gradient-to-r from-[#029bba] to-[#027a94] transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#029bba]">{profileCompletion}%</span>
                </div>
              </div>
            </div>
            <Link
              href="/agent/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold shadow-md shadow-[#029bba]/20 transition-colors whitespace-nowrap"
            >
              Complete Now
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ── 3. PRIMARY STATS ROW (4 cards) ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total Listings"
          value={dataLoading ? "—" : stats.total}
          icon={<FolderOpen className="w-5 h-5" />}
          color="teal"
          href="/agent/listings"
        />
        <StatCard
          label="Active"
          value={dataLoading ? "—" : stats.active}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          subLabel={stats.pending > 0 ? `${stats.pending} pending review` : undefined}
        />
        <StatCard
          label="Total Leads"
          value={dataLoading ? "—" : stats.totalLeads}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          subLabel={stats.newLeads > 0 ? `${stats.newLeads} new` : undefined}
          href="/agent/leads"
        />
        <StatCard
          label="Conversion Rate"
          value={dataLoading ? "—" : `${stats.conversionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="indigo"
          subLabel={stats.wonLeads > 0 ? `${stats.wonLeads} deals won` : undefined}
        />
      </div>

      {/* ── 4. SECONDARY STATS ROW (4 cards) ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Views"
          value={dataLoading ? "—" : stats.totalViews.toLocaleString()}
          icon={<Eye className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Total Deals"
          value={profileLoading ? "—" : totalDeals}
          icon={<Award className="w-5 h-5" />}
          color="orange"
          subLabel={
            profile?.experience?.totalValue && profile.experience.totalValue > 0
              ? formatCurrency(profile.experience.totalValue)
              : undefined
          }
        />
        <StatCard
          label="Average Rating"
          value={profileLoading ? "—" : avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
          icon={<Star className="w-5 h-5" />}
          color="rose"
          subLabel={totalReviews > 0 ? `${totalReviews} reviews` : "No reviews yet"}
        />
        <StatCard
          label="Response Rate"
          value={profileLoading ? "—" : responseRate > 0 ? `${responseRate}%` : "N/A"}
          icon={<Zap className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* ── 5. VISUALIZATION ROW — Chart + Badges ──────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Leads Funnel Chart (2 cols wide) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#029bba]" />
                Leads Funnel
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Track your lead journey from new to won
              </p>
            </div>
            <Link
              href="/agent/leads"
              className="text-xs text-[#029bba] font-semibold hover:underline flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {dataLoading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leadFunnel.every((f) => f.count === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-10 h-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-500 font-medium">No leads yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Chart will populate as inquiries come in
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={leadFunnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {leadFunnel.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Badges & Achievements */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#029bba]" />
              Achievements
            </h3>
          </div>

          {profileLoading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : badges.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <Medal className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-700">No badges yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Earn badges by closing deals, verifying documents, and getting reviews
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {badges.map((badge) => {
                const meta = BADGE_META[badge];
                if (!meta) return null;
                return (
                  <div
                    key={badge}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border ${meta.bg} ${meta.border}`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${meta.color}`}>
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-gray-500">Earned</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 6. PROPERTIES TABLE ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Properties</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your 5 most recent listings</p>
          </div>
          <Link
            href="/agent/listings"
            className="text-xs font-semibold text-[#029bba] hover:underline flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {dataLoading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading properties...</p>
          </div>
        ) : properties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {["Property", "Location", "Type", "Price", "Status", "Views", ""].map((h, i) => (
                    <th
                      key={h || `col-${i}`}
                      className={`px-5 py-3.5 font-bold text-[11px] uppercase tracking-wider text-gray-500 ${
                        i >= 5 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((p) => {
                  const primary = p.images?.find((i) => i.isPrimary) ?? p.images?.[0];
                  const img     = primary?.url ?? p.featureImageUrl;
                  const status  = p.verification?.status ?? p.status ?? "draft";
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 relative">
                            {img ? (
                              <Image
                                src={img}
                                alt={p.title}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate max-w-[200px] group-hover:text-[#029bba] transition-colors">
                              {p.title}
                            </p>
                            {p.createdAt && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {timeAgo(p.createdAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {p.society ?? p.locality ?? p.city}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            p.listingType === "rent"
                              ? "bg-teal-50 text-teal-700"
                              : p.listingType === "installment"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-[#029bba]/10 text-[#029bba]"
                          }`}
                        >
                          {p.listingType === "rent"
                            ? "Rent"
                            : p.listingType === "installment"
                            ? "Installment"
                            : "Sale"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-800">
                        PKR {formatPrice(p.totalPrice ?? p.price)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-600 font-semibold">
                        {(p.views ?? 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <a
                            href={`/property/${p.slug ?? p._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-[#029bba] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Live"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <Link
                            href={`/edit-property/${p.slug ?? p._id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyProperties />
        )}
      </div>

      {/* ── 7. LEADS TABLE ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Leads</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your 5 latest inquiries</p>
          </div>
          <Link
            href="/agent/leads"
            className="text-xs font-semibold text-[#029bba] hover:underline flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {dataLoading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading leads...</p>
          </div>
        ) : leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {["Contact", "Inquiry", "Status", "Date", "Actions"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 font-bold text-[11px] uppercase tracking-wider text-gray-500 ${
                        i === 4 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate max-w-[140px]">
                            {lead.name}
                          </p>
                          {lead.phone && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                      {getLeadEntityName(lead)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {timeAgo(lead.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyLeads />
        )}
      </div>

      {/* ── 8. QUICK ACTIONS ───────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/add-property" className="group">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all">
            <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 flex items-center justify-center mb-3 group-hover:bg-[#029bba] transition-colors">
              <Plus className="w-5 h-5 text-[#029bba] group-hover:text-white transition-colors" />
            </div>
            <p className="font-bold text-gray-900 text-sm group-hover:text-[#029bba] transition-colors">
              Add New Property
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              List a new property for sale or rent
            </p>
          </div>
        </Link>

        <Link href="/agent/leads" className="group">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all">
            <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center mb-3 group-hover:bg-violet-600 transition-colors">
              <MessageSquare className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
            </div>
            <p className="font-bold text-gray-900 text-sm group-hover:text-violet-600 transition-colors">
              Manage Leads
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Track and respond to inquiries
            </p>
          </div>
        </Link>

        <Link href="/agent/profile" className="group">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-600 transition-colors">
              <Building2 className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <p className="font-bold text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
              Edit Profile
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Update your professional profile
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function AgentDashboardPage(): React.ReactElement {
  return (
    <AgentLayout
      title="Agent Dashboard | Highrise.pk"
      description="Manage your property listings, leads, and profile on Highrise.pk"
    >
      <DashboardContent />
    </AgentLayout>
  );
}

// ========== END OF FILE ==========