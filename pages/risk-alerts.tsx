/**
 * pages/risk-alerts.tsx
 *
 * Public Risk Alerts page — full filterable feed of society + project alerts.
 * Sourced from GET /api/risk-alerts with real-time filtering.
 *
 * V5.7.0 — Phase A: Unified Risk Intelligence System
 */

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  AlertTriangle, Shield, ShieldCheck, MapPin, Clock,
  ChevronRight, ArrowRight, Loader2, Activity, Info,
  Building, Filter, X, Search, RefreshCw, Home,
  FileText, DollarSign, Wrench, AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface RiskAlertItem {
  _id: string;
  society: string;
  city: string;
  message: string;
  authority: string;
  date: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'legal' | 'financial' | 'construction' | 'fraud' | 'noc' | 'general';
  status: 'active' | 'resolved' | 'investigating';
  sourceType: 'society' | 'project';
  sourceSlug: string;
  sourceUrl?: string;
  affectedUnits?: string[];
  issuedAt: string;
  resolvedAt?: string;
}

interface AlertStats {
  activeCount: number;
  criticalCount: number;
  highCount: number;
  societyAlerts: number;
  projectAlerts: number;
  resolvedCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    bg: 'bg-[#ef4444]/15',
    text: 'text-[#fca5a5]',
    border: 'border-[#ef4444]/30',
    dot: 'bg-[#ef4444]',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    accentLine: 'via-[#ef4444]',
    glow: 'bg-[#ef4444]',
    ping: true,
  },
  high: {
    label: 'High Risk',
    bg: 'bg-[#ef4444]/15',
    text: 'text-[#fca5a5]',
    border: 'border-[#ef4444]/30',
    dot: 'bg-[#ef4444]',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    accentLine: 'via-[#ef4444]',
    glow: 'bg-[#ef4444]',
    ping: false,
  },
  medium: {
    label: 'Caution',
    bg: 'bg-[#f59e0b]/15',
    text: 'text-[#fcd34d]',
    border: 'border-[#f59e0b]/30',
    dot: 'bg-[#f59e0b]',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    accentLine: 'via-[#f59e0b]',
    glow: 'bg-[#f59e0b]',
    ping: false,
  },
  low: {
    label: 'Low Risk',
    bg: 'bg-[#029bba]/15',
    text: 'text-[#06b6d4]',
    border: 'border-[#029bba]/30',
    dot: 'bg-[#029bba]',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    accentLine: 'via-[#029bba]',
    glow: 'bg-[#029bba]',
    ping: false,
  },
} as const;

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactElement }> = {
  legal:        { label: 'Legal / Court',   icon: <FileText className="w-3.5 h-3.5" /> },
  financial:    { label: 'Financial',        icon: <DollarSign className="w-3.5 h-3.5" /> },
  construction: { label: 'Construction',     icon: <Wrench className="w-3.5 h-3.5" /> },
  fraud:        { label: 'Fraud',            icon: <AlertCircle className="w-3.5 h-3.5" /> },
  noc:          { label: 'NOC / Approval',   icon: <Shield className="w-3.5 h-3.5" /> },
  general:      { label: 'General',          icon: <Info className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active:       { label: 'Active',       bg: 'bg-red-100',    text: 'text-red-700' },
  investigating:{ label: 'Investigating', bg: 'bg-amber-100',  text: 'text-amber-800' },
  resolved:     { label: 'Resolved',     bg: 'bg-green-100',  text: 'text-green-700' },
};

const CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi',
  'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Gujranwala', 'Sialkot',
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildDetailHref(alert: RiskAlertItem): string {
  if (alert.sourceType === 'society' && alert.sourceSlug) {
    return `/tools/verify-society/${alert.sourceSlug}`;
  }
  if (alert.sourceType === 'project' && alert.sourceSlug) {
    return `/projects/${alert.sourceSlug}`;
  }
  return '#';
}

// ─────────────────────────────────────────────
// Alert Card Component
// ─────────────────────────────────────────────

function AlertCard({ alert }: { alert: RiskAlertItem }): React.ReactElement {
  const sev    = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium;
  const cat    = CATEGORY_CONFIG[alert.category] ?? CATEGORY_CONFIG.general;
  const status = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.active;
  const href   = buildDetailHref(alert);

  return (
    <div className="group relative bg-white/[0.05] backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300 overflow-hidden hover:-translate-y-1">
      {/* Severity accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${sev.accentLine} to-transparent opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      <div className="p-6">
        {/* Row 1: Severity + Source Type + Status + Date */}
        <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${sev.bg} ${sev.text} ${sev.border}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${sev.dot} ${sev.ping ? 'animate-ping' : 'animate-pulse'}`}
              />
              {sev.label}
            </div>

            {/* Source type */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/60 border border-white/15">
              {alert.sourceType === 'project' ? (
                <><Building className="w-2.5 h-2.5" /> Project</>
              ) : (
                <><Home className="w-2.5 h-2.5" /> Society</>
              )}
            </span>

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>

          <span className="text-[10px] text-white/40 font-medium flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {alert.date}
          </span>
        </div>

        {/* Name + Category */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-white text-lg leading-tight group-hover:text-[#06b6d4] transition-colors flex-1">
            {alert.society}
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/50 whitespace-nowrap flex-shrink-0">
            {cat.icon}
            {cat.label}
          </span>
        </div>

        {/* City + Authority */}
        <div className="flex items-center gap-3 text-xs text-white/60 mb-4">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {alert.city}
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Issued by {alert.authority}
          </span>
        </div>

        {/* Message */}
        <div className="relative pl-3 border-l-2 border-white/15 mb-4">
          <p className="text-sm text-white/80 leading-relaxed">
            {alert.message}
          </p>
        </div>

        {/* Affected units (if any) */}
        {Array.isArray(alert.affectedUnits) && alert.affectedUnits.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold w-full mb-1">
              Affected:
            </span>
            {alert.affectedUnits.slice(0, 4).map((unit) => (
              <span
                key={unit}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/60"
              >
                {unit}
              </span>
            ))}
            {alert.affectedUnits.length > 4 && (
              <span className="text-[10px] text-white/40">
                +{alert.affectedUnits.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          {/* Resolved at (if resolved) */}
          {alert.status === 'resolved' && alert.resolvedAt && (
            <span className="text-[10px] text-[#10b981] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Resolved {new Date(alert.resolvedAt).toLocaleDateString('en-PK')}
            </span>
          )}
          {alert.status !== 'resolved' && (
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              Verified Source
            </span>
          )}

          <div className="flex items-center gap-3">
            {alert.sourceUrl && (
              <a
                href={alert.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-white/40 hover:text-white/70 transition-colors underline"
                onClick={(e) => e.stopPropagation()}
              >
                Official Notice ↗
              </a>
            )}
            {href !== '#' && (
              <Link href={href}>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#06b6d4] hover:gap-2 transition-all">
                  Full Report
                  <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow */}
      <div
        className={`absolute -right-12 -bottom-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none blur-2xl ${sev.glow}`}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────

export default function RiskAlertsPage(): React.ReactElement {
  // ── State ────────────────────────────────────
  const [alerts, setAlerts]           = useState<RiskAlertItem[]>([]);
  const [stats, setStats]             = useState<AlertStats | null>(null);
  const [pagination, setPagination]   = useState<Pagination | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');

  // Filters
  const [typeFilter, setTypeFilter]         = useState<'all'|'society'|'project'>('all');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState<'active'|'resolved'|'investigating'>('active');
  const [cityFilter, setCityFilter]         = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [showFilters, setShowFilters]       = useState(false);

  // ── Fetch ─────────────────────────────────────
  const fetchAlerts = useCallback(async (page = 1, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('limit', '12');
      params.set('page',  String(page));
      params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (severityFilter)       params.set('severity', severityFilter);
      if (categoryFilter)       params.set('category', categoryFilter);
      if (cityFilter)           params.set('city', cityFilter);

      const res  = await fetch(`/api/risk-alerts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to load risk alerts.');
        return;
      }

      setAlerts((prev) =>
        append ? [...prev, ...(data.alerts ?? [])] : (data.alerts ?? [])
      );
      setStats(data.stats ?? null);
      setPagination(data.pagination ?? null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, severityFilter, categoryFilter, statusFilter, cityFilter]);

  // Refetch when filters change
  useEffect(() => {
    fetchAlerts(1, false);
  }, [fetchAlerts]);

  // ── Derived filtered list (client-side search query) ──
  const filteredAlerts = searchQuery.trim()
    ? alerts.filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          a.society.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          a.authority.toLowerCase().includes(q)
        );
      })
    : alerts;

  const hasActiveFilters =
    typeFilter !== 'all' ||
    severityFilter !== '' ||
    categoryFilter !== '' ||
    statusFilter !== 'active' ||
    cityFilter !== '' ||
    searchQuery !== '';

  const clearFilters = () => {
    setTypeFilter('all');
    setSeverityFilter('');
    setCategoryFilter('');
    setStatusFilter('active');
    setCityFilter('');
    setSearchQuery('');
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Property Risk Alerts Pakistan — Society & Project Warnings | Highrise.pk</title>
        <meta
          name="description"
          content="Check real-time risk alerts for housing societies and property projects across Pakistan. Court orders, NOC issues, fraud warnings from LDA, RDA, KDA and official authorities."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Property Risk Alerts Pakistan | Highrise.pk" />
        <meta property="og:description" content="Real-time intelligence on illegal, disputed, or risky housing schemes and projects across Pakistan." />
        <link rel="canonical" href="https://highrise.pk/risk-alerts" />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Property Risk Alerts Pakistan',
              description: 'Real-time risk intelligence on housing societies and projects in Pakistan.',
              url: 'https://highrise.pk/risk-alerts',
              provider: {
                '@type': 'Organization',
                name: 'Highrise.pk',
                url: 'https://highrise.pk',
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#001f2b] to-[#001520]">

        {/* ── HERO ─────────────────────────────── */}
        <section className="relative pt-16 pb-12 overflow-hidden">
          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ef4444] to-transparent" />

          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-white/40 mb-8">
              <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/70">Risk Alerts</span>
            </nav>

            <div className="max-w-4xl">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#fca5a5] text-xs font-bold uppercase tracking-wider mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
                </span>
                Live Risk Intelligence
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                Property Risk{' '}
                <span className="text-[#06b6d4]">Alert Board</span>
              </h1>
              <p className="text-white/70 text-lg max-w-3xl mb-8">
                Real-time intelligence on illegal, disputed, or financially risky housing societies and property
                projects across Pakistan. All alerts sourced from official authorities.
              </p>

              {/* Stats strip */}
              {stats && (
                <div className="flex flex-wrap gap-6">
                  {[
                    {
                      value: stats.activeCount,
                      label: 'Active Alerts',
                      color: 'text-[#fca5a5]',
                      icon: <AlertTriangle className="w-4 h-4" />,
                    },
                    {
                      value: stats.criticalCount,
                      label: 'Critical',
                      color: 'text-[#ef4444]',
                      icon: <AlertCircle className="w-4 h-4" />,
                    },
                    {
                      value: stats.societyAlerts,
                      label: 'Society Alerts',
                      color: 'text-[#06b6d4]',
                      icon: <Shield className="w-4 h-4" />,
                    },
                    {
                      value: stats.projectAlerts,
                      label: 'Project Alerts',
                      color: 'text-[#06b6d4]',
                      icon: <Building className="w-4 h-4" />,
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className={`${s.color}`}>{s.icon}</div>
                      <div>
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-[10px] text-white/50 uppercase tracking-wider">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FILTERS + CONTENT ─────────────────── */}
        <section className="container mx-auto px-4 pb-20">

          {/* ── Filter Bar ─────────────────────── */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-8">
            {/* Top row */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by society, city, authority..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#029bba]/50 focus:border-[#029bba]/50 transition-colors"
                />
              </div>

              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                {(['active', 'investigating', 'resolved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                      statusFilter === s
                        ? 'bg-[#029bba] text-white shadow-md'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Advanced filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-[#029bba]/20 border-[#029bba]/40 text-[#06b6d4]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[#029bba]" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={() => fetchAlerts(1, false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Advanced filters (collapsible) */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Type filter */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1.5">
                    Source Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                  >
                    <option value="all">All Sources</option>
                    <option value="society">Society Only</option>
                    <option value="project">Project Only</option>
                  </select>
                </div>

                {/* Severity filter */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1.5">
                    Severity
                  </label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                  >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Caution</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1.5">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                  >
                    <option value="">All Categories</option>
                    <option value="legal">Legal / Court</option>
                    <option value="financial">Financial</option>
                    <option value="construction">Construction</option>
                    <option value="fraud">Fraud</option>
                    <option value="noc">NOC / Approval</option>
                    <option value="general">General</option>
                  </select>
                </div>

                {/* City filter */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1.5">
                    City
                  </label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                  >
                    <option value="">All Cities</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Active:</span>
                {typeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#029bba]/20 border border-[#029bba]/30 text-[#06b6d4] text-[10px] font-bold">
                    {typeFilter}
                    <button onClick={() => setTypeFilter('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {severityFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#fca5a5] text-[10px] font-bold">
                    {severityFilter}
                    <button onClick={() => setSeverityFilter('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[10px] font-bold">
                    {CATEGORY_CONFIG[categoryFilter]?.label ?? categoryFilter}
                    <button onClick={() => setCategoryFilter('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {cityFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[10px] font-bold">
                    {cityFilter}
                    <button onClick={() => setCityFilter('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[10px] font-bold">
                    &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-white/40 hover:text-white/70 underline transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ── Alert Grid ───────────────────────── */}
          {loading ? (
            // Loading skeleton
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white/[0.05] backdrop-blur-md rounded-2xl border border-white/10 p-6 animate-pulse"
                >
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-24 bg-white/10 rounded-full" />
                    <div className="h-6 w-16 bg-white/10 rounded-full" />
                  </div>
                  <div className="h-6 w-3/4 bg-white/10 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-white/10 rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-5/6" />
                    <div className="h-3 bg-white/10 rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-20 bg-white/[0.03] rounded-2xl border border-white/10">
              <AlertTriangle className="w-12 h-12 text-[#ef4444]/60 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Alerts</h3>
              <p className="text-white/50 text-sm mb-6">{error}</p>
              <button
                onClick={() => fetchAlerts(1, false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#027a94] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : filteredAlerts.length === 0 ? (
            // Empty state
            <div className="text-center py-20 bg-white/[0.03] rounded-2xl border border-white/10">
              <ShieldCheck className="w-16 h-16 text-[#10b981]/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {statusFilter === 'active'
                  ? 'No Active Alerts Found'
                  : `No ${statusFilter} alerts found`}
              </h3>
              <p className="text-white/50 text-sm mb-2">
                {hasActiveFilters
                  ? 'Try adjusting your filters.'
                  : 'No risk alerts currently match your search.'}
              </p>
              {statusFilter === 'active' && !hasActiveFilters && (
                <p className="text-[#10b981] text-sm font-medium">
                  ✅ Good news — no active risk alerts for this area!
                </p>
              )}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Result count */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-white/50">
                  Showing{' '}
                  <span className="text-white font-semibold">{filteredAlerts.length}</span>
                  {pagination && pagination.total > filteredAlerts.length && (
                    <> of <span className="text-white font-semibold">{pagination.total}</span></>
                  )}{' '}
                  {statusFilter} alerts
                  {searchQuery && (
                    <> matching &quot;<span className="text-[#06b6d4]">{searchQuery}</span>&quot;</>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Activity className="w-3.5 h-3.5" />
                  Sorted by severity
                </div>
              </div>

              {/* Alert grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert._id} alert={alert} />
                ))}
              </div>

              {/* Load more */}
              {pagination?.hasMore && !searchQuery && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => fetchAlerts(pagination.page + 1, true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                    ) : (
                      <>Load More Alerts <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <p className="text-[10px] text-white/30 mt-3">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Disclaimer + CTA ─────────────────── */}
          <div className="mt-16 grid md:grid-cols-2 gap-6">
            {/* Disclaimer */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#06b6d4] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-2">Data Sources & Disclaimer</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    All alerts are sourced from official government authorities including LDA, CDA, RDA, KDA, DHA,
                    PHATA, and court records. Highrise.pk does not independently verify every claim.
                    Always conduct due diligence before making investment decisions.
                    For official records, visit the respective authority&apos;s website.
                  </p>
                </div>
              </div>
            </div>

            {/* Verify Society CTA */}
            <div className="bg-gradient-to-br from-[#029bba]/20 to-[#004063]/20 border border-[#029bba]/30 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <ShieldCheck className="w-8 h-8 text-[#06b6d4] mb-3" />
                <h4 className="font-bold text-white text-lg mb-2">
                  Verify Before You Buy
                </h4>
                <p className="text-white/60 text-sm">
                  Use our free Society Verification Tool to check NOC status, legal approvals,
                  and risk scores for any housing scheme in Pakistan.
                </p>
              </div>
              <Link href="/tools/verify-society" className="mt-4">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold text-sm transition-colors shadow-lg">
                  <Shield className="w-4 h-4" />
                  Verify a Society Free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}