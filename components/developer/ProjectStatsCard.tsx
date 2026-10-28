// components/developer/ProjectStatsCard.tsx
// Design System v19 Compliant -- Central icon registry and color tokens bound
import React from 'react';
import Link from 'next/link';
import { icons } from '@/lib/design-system/icons';
import { colors } from '@/lib/design-system/tokens';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectStats {
  totalProjects:       number;
  activeProjects:      number;
  draftProjects:       number;
  pendingProjects:     number;
  verifiedProjects:    number;
  rejectedProjects:    number;
  totalUnits:          number;
  availableUnits:      number;
  soldUnits:           number;
  reservedUnits:       number;
  totalViews:          number;
  totalInquiries:      number;
  totalLeads:          number;
  conversionRate:      number;
  totalRevenue:        number;
  avgPrice:            number;
  viewsTrend?:         number;  // percentage change
  inquiriesTrend?:     number;
  leadsTrend?:         number;
}

export interface ProjectStatsCardProps {
  stats:      ProjectStats;
  variant?:   'full' | 'compact' | 'sidebar';
  className?: string;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatNumber(num: number): string {
  if (!num && num !== 0) return '0';
  if (num >= 10_000_000) {
    const crore = num / 10_000_000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(1)} Cr`;
  }
  if (num >= 100_000) {
    const lac = num / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} L`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function formatPKR(amount: number): string {
  if (!amount || amount <= 0) return 'PKR 0';
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    const lac = amount / 100_000;
    return `PKR ${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

function TrendIndicator({ value }: { value?: number }): React.ReactElement | null {
  if (value === undefined || value === null) return null;

  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
        <icons.ArrowUpRight className="w-3 h-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500">
        <icons.ArrowDownRight className="w-3 h-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="text-xs font-semibold text-gray-400">0%</span>
  );
}

// ============================================================================
// STAT CARD ITEM (reusable)
// ============================================================================

interface StatItemProps {
  label:     string;
  value:     string | number;
  icon:      React.ReactElement;
  iconBg:    string;
  iconColor: string;
  trend?:    number;
  href?:     string;
  subtitle?: string;
}

function StatItem({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  href,
  subtitle,
}: StatItemProps): React.ReactElement {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100
                    hover:border-gray-200 hover:shadow-sm transition-all duration-200 group">
      {/* Icon */}
      <div
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${iconBg} ${iconColor}
        `}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-lg font-black text-gray-900">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          <TrendIndicator value={trend} />
        </div>
        {subtitle && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Arrow for linked items */}
      {href && (
        <icons.ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba]
                               transition-colors flex-shrink-0" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

// ============================================================================
// UNIT STATUS BAR
// ============================================================================

function UnitStatusBar({
  available,
  reserved,
  sold,
  total,
}: {
  available: number;
  reserved:  number;
  sold:      number;
  total:     number;
}): React.ReactElement {
  if (total === 0) return <></>;

  const availPct  = Math.round((available / total) * 100);
  const resvPct   = Math.round((reserved / total) * 100);
  const soldPct   = Math.round((sold / total) * 100);

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 font-medium">Unit Inventory</span>
        <span className="text-gray-700 font-bold">{total} Total</span>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
        {soldPct > 0 && (
          <div
            className="h-full bg-red-400 transition-all duration-500"
            style={{ width: `${soldPct}%` }}
          />
        )}
        {resvPct > 0 && (
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${resvPct}%` }}
          />
        )}
        {availPct > 0 && (
          <div
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${availPct}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-gray-500 font-medium">
            Available ({available})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[10px] text-gray-500 font-medium">
            Reserved ({reserved})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-[10px] text-gray-500 font-medium">
            Sold ({sold})
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROJECT STATUS PILLS
// ============================================================================

function ProjectStatusPills({
  stats,
}: {
  stats: ProjectStats;
}): React.ReactElement {
  const statusItems = [
    {
      label: 'Verified',
      count: stats.verifiedProjects,
      icon:  <icons.CheckCircle2 className="w-3 h-3" />,
      bg:    'bg-emerald-100',
      text:  'text-emerald-700',
    },
    {
      label: 'Active',
      count: stats.activeProjects,
      icon:  <icons.Building2 className="w-3 h-3" />,
      bg:    'bg-blue-100',
      text:  'text-blue-700',
    },
    {
      label: 'Pending',
      count: stats.pendingProjects,
      icon:  <icons.Clock className="w-3 h-3" />,
      bg:    'bg-amber-100',
      text:  'text-amber-700',
    },
    {
      label: 'Draft',
      count: stats.draftProjects,
      icon:  <icons.Layers className="w-3 h-3" />,
      bg:    'bg-gray-100',
      text:  'text-gray-600',
    },
    {
      label: 'Rejected',
      count: stats.rejectedProjects,
      icon:  <icons.XCircle className="w-3 h-3" />,
      bg:    'bg-red-100',
      text:  'text-red-600',
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {statusItems.map((item) => (
        <span
          key={item.label}
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
            ${item.bg} ${item.text} text-xs font-semibold
          `}
        >
          {item.icon}
          {item.count} {item.label}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// SIDEBAR VARIANT
// ============================================================================

function SidebarStats({
  stats,
  className,
}: {
  stats:      ProjectStats;
  className?: string;
}): React.ReactElement {
  const soldPercentage = stats.totalUnits > 0
    ? Math.round((stats.soldUnits / stats.totalUnits) * 100)
    : 0;

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-white border border-gray-100 text-center">
          <p className="text-2xl font-black text-[#004063]">
            {stats.totalProjects}
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
            Projects
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-gray-100 text-center">
          <p className="text-2xl font-black text-[#029bba]">
            {stats.totalUnits}
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
            Total Units
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-gray-100 text-center">
          <p className="text-2xl font-black text-emerald-600">
            {soldPercentage}%
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
            Sold
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-gray-100 text-center">
          <p className="text-2xl font-black text-amber-600">
            {formatNumber(stats.totalLeads)}
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
            Leads
          </p>
        </div>
      </div>

      {/* Quick stats list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <icons.Eye className="w-3 h-3" /> Views
          </span>
          <span className="text-xs font-bold text-gray-700">
            {formatNumber(stats.totalViews)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <icons.MessageSquare className="w-3 h-3" /> Inquiries
          </span>
          <span className="text-xs font-bold text-gray-700">
            {formatNumber(stats.totalInquiries)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <icons.Target className="w-3 h-3" /> Conversion
          </span>
          <span className="text-xs font-bold text-gray-700">
            {stats.conversionRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <icons.DollarSign className="w-3 h-3" /> Revenue
          </span>
          <span className="text-xs font-bold text-gray-700">
            {formatPKR(stats.totalRevenue)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

function CompactStats({
  stats,
  className,
}: {
  stats:      ProjectStats;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-[#004063] flex items-center gap-2">
          <icons.BarChart3 className="w-4 h-4 text-[#029bba]" />
          Quick Stats
        </h3>
        <Link
          href="/developer/analytics"
          className="text-xs font-semibold text-[#029bba] hover:underline
                     flex items-center gap-1"
        >
          View All <icons.ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-xl font-black text-[#004063]">{stats.totalProjects}</p>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Projects</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-[#029bba]">{stats.totalUnits}</p>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Units</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-emerald-600">{formatNumber(stats.totalViews)}</p>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Views</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-amber-600">{formatNumber(stats.totalLeads)}</p>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Leads</p>
        </div>
      </div>

      {/* Unit bar */}
      <UnitStatusBar
        available={stats.availableUnits}
        reserved={stats.reservedUnits}
        sold={stats.soldUnits}
        total={stats.totalUnits}
      />
    </div>
  );
}

// ============================================================================
// FULL VARIANT (DEFAULT)
// ============================================================================

export default function ProjectStatsCard({
  stats,
  variant   = 'full',
  className = '',
}: ProjectStatsCardProps): React.ReactElement {
  // Sidebar variant
  if (variant === 'sidebar') {
    return <SidebarStats stats={stats} className={className} />;
  }

  // Compact variant
  if (variant === 'compact') {
    return <CompactStats stats={stats} className={className} />;
  }

  // Empty state
  if (stats.totalProjects === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center ${className}`}>
        <icons.Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-gray-700 mb-1">
          Koi Project Nahi Hai
        </h3>
        <p className="text-sm text-gray-400 mb-4 max-w-sm mx-auto">
          Apna pehla project add karein aur yahan par sab stats dikhenge -- views, leads, sales sab kuch.
        </p>
        <Link
          href="/developer/projects/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-[#029bba] to-[#027a94]
                     text-white font-semibold text-sm
                     hover:from-[#02a8c9] hover:to-[#028aaa]
                     hover:shadow-lg transition-all duration-200"
        >
          <icons.PlusCircle className="w-4 h-4" />
          Add First Project
        </Link>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#004063] flex items-center gap-2">
            <icons.BarChart3 className="w-5 h-5 text-[#029bba]" />
            Project Overview
          </h3>
          <Link
            href="/developer/analytics"
            className="text-xs font-semibold text-[#029bba] hover:underline
                       flex items-center gap-1"
          >
            Detailed Analytics <icons.ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Project status pills */}
        <ProjectStatusPills stats={stats} />
      </div>

      {/* Stats grid */}
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatItem
            label="Total Projects"
            value={stats.totalProjects}
            icon={<icons.Building2 className="w-5 h-5" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            href="/developer/projects"
          />
          <StatItem
            label="Total Units"
            value={stats.totalUnits}
            icon={<icons.Home className="w-5 h-5" />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatItem
            label="Total Views"
            value={stats.totalViews}
            icon={<icons.Eye className="w-5 h-5" />}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-600"
            trend={stats.viewsTrend}
            subtitle="Last 30 days"
          />
          <StatItem
            label="Inquiries"
            value={stats.totalInquiries}
            icon={<icons.MessageSquare className="w-5 h-5" />}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            trend={stats.inquiriesTrend}
            subtitle="Last 30 days"
          />
          <StatItem
            label="Active Leads"
            value={stats.totalLeads}
            icon={<icons.Users className="w-5 h-5" />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            trend={stats.leadsTrend}
            href="/developer/leads"
          />
          <StatItem
            label="Conversion Rate"
            value={`${stats.conversionRate.toFixed(1)}%`}
            icon={<icons.Target className="w-5 h-5" />}
            iconBg="bg-pink-50"
            iconColor="text-pink-600"
            subtitle={`${stats.soldUnits} sold of ${stats.totalUnits}`}
          />
        </div>

        {/* Unit status bar */}
        <UnitStatusBar
          available={stats.availableUnits}
          reserved={stats.reservedUnits}
          sold={stats.soldUnits}
          total={stats.totalUnits}
        />

        {/* Revenue */}
        {stats.totalRevenue > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <icons.DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Total Revenue
                  </p>
                  <p className="text-lg font-black text-green-600">
                    {formatPKR(stats.totalRevenue)}
                  </p>
                </div>
              </div>

              {stats.avgPrice > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Avg Unit Price
                  </p>
                  <p className="text-sm font-bold text-gray-700">
                    {formatPKR(stats.avgPrice)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}