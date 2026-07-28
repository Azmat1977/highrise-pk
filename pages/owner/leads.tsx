// pages/owner/leads.tsx
// Owner: View inquiries received on their properties
// Gracefully handles the case where Lead/Inquiry model doesn't exist yet.

import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Users, Phone, Mail, Search, Loader2, Eye, ChevronLeft,
  ChevronRight, RefreshCw, Clock, MessageSquare, XCircle,
  MapPin, Bot, Thermometer, User, Building2, AlertCircle,
  Rocket, Zap, Home, X, CheckCircle2, Target, Flame,
  Star, Filter, Download,
} from "lucide-react";
import OwnerLayout from "@/components/owner/OwnerLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertySnapshot {
  _id?:         string;
  title?:       string;
  slug?:        string;
  city?:        string;
  society?:     string;
  price?:       number;
  primaryImage?: string;
}

interface Lead {
  _id:               string;
  name:              string;
  email:             string;
  phone:             string;
  message?:          string;
  leadType?:         string;
  propertySnapshot?: PropertySnapshot;
  leadScore?:        number;
  priority?:         "low" | "medium" | "high" | "urgent";
  status?:           string;
  source?:           string;
  temperature?:      "cold" | "warm" | "hot" | "burning";
  conversationId?:   string;
  sessionId?:        string;
  isArchived?:       boolean;
  createdAt:         string;
  lastContactedAt?:  string;
}

interface LeadStats {
  all:            number;
  new:            number;
  contacted:      number;
  qualified:      number;
  won:            number;
  conversionRate: number;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

interface BannerState {
  type:    "success" | "error" | "warning";
  message: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string;
}> = {
  new:       { label: "New",       color: "text-blue-700",    bg: "bg-blue-100" },
  contacted: { label: "Contacted", color: "text-violet-700",  bg: "bg-violet-100" },
  qualified: { label: "Qualified", color: "text-orange-700",  bg: "bg-orange-100" },
  won:       { label: "Won",       color: "text-emerald-700", bg: "bg-emerald-100" },
  lost:      { label: "Lost",      color: "text-red-700",     bg: "bg-red-100" },
  nurture:   { label: "Nurture",   color: "text-gray-700",    bg: "bg-gray-100" },
};

const TEMP_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  cold:    { label: "Cold",    bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  warm:    { label: "Warm",    bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
  hot:     { label: "Hot",     bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  burning: { label: "Burning", bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEntityName(lead: Lead): string {
  return lead.propertySnapshot?.title ?? "General Inquiry";
}

function getEntityLocation(lead: Lead): string {
  if (lead.propertySnapshot?.city) {
    return lead.propertySnapshot.society
      ? `${lead.propertySnapshot.society}, ${lead.propertySnapshot.city}`
      : lead.propertySnapshot.city;
  }
  return "—";
}

function isAleemLead(lead: Lead): boolean {
  return lead.source === "direct" && Boolean(lead.conversationId ?? lead.sessionId);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function Banner({
  banner, onClose,
}: {
  banner:  BannerState;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500]
        flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border
        backdrop-blur-sm max-w-sm w-full mx-4
        ${
          banner.type === "success"
            ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
            : banner.type === "error"
            ? "bg-red-50/95 border-red-200 text-red-800"
            : "bg-amber-50/95 border-amber-200 text-amber-800"
        }`}
    >
      <span className="text-sm font-semibold flex-1">{banner.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({
  lead, onClose,
}: {
  lead:    Lead;
  onClose: () => void;
}): React.ReactElement {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const entityName     = getEntityName(lead);
  const entityLocation = getEntityLocation(lead);
  const tempCfg        = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;
  const statusCfg      = STATUS_CONFIG[lead.status ?? "new"] ?? STATUS_CONFIG.new;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900">{lead.name}</h2>
              {isAleemLead(lead) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#029bba]/10 text-[#029bba] rounded-full text-[11px] font-bold border border-[#029bba]/20">
                  <Bot className="w-3 h-3" /> Aleem AI
                </span>
              )}
              {tempCfg && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${tempCfg.bg} ${tempCfg.text} ${tempCfg.border}`}>
                  <Thermometer className="w-3 h-3" /> {tempCfg.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Inquiry ID: {lead._id.slice(-8)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Score + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Interest Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (lead.leadScore ?? 0) >= 80 ? "bg-emerald-500" :
                      (lead.leadScore ?? 0) >= 60 ? "bg-orange-500" :
                      (lead.leadScore ?? 0) >= 40 ? "bg-amber-500" : "bg-gray-400"
                    }`}
                    style={{ width: `${lead.leadScore ?? 0}%` }}
                  />
                </div>
                <span className="text-xl font-black text-gray-900">{lead.leadScore ?? 0}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#029bba]" /> Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="font-semibold text-[#029bba] hover:underline flex items-center gap-2 break-all"
                >
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" /> {lead.email}
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Phone</p>
                <a
                  href={`tel:${lead.phone}`}
                  className="font-semibold text-[#029bba] hover:underline flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" /> {lead.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Property Info */}
          {lead.propertySnapshot && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#029bba]" />
                Property Details
              </h4>
              <div className="flex items-start gap-4">
                {lead.propertySnapshot.primaryImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lead.propertySnapshot.primaryImage}
                    alt={entityName}
                    className="w-20 h-20 rounded-xl object-cover border border-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-gray-900 text-base truncate">{entityName}</h5>
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {entityLocation}
                  </p>
                  {lead.propertySnapshot.price && (
                    <p className="text-sm font-bold text-[#029bba] mt-1.5">
                      PKR {lead.propertySnapshot.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {lead.message && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Message</h4>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {lead.message}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Received</p>
              <p className="font-semibold text-gray-900">{formatDateTime(lead.createdAt)}</p>
            </div>
            {lead.lastContactedAt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Last Contacted</p>
                <p className="font-semibold text-gray-900">{formatDateTime(lead.lastContactedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#20b358] transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </a>
            <a
              href={`mailto:${lead.email}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coming Soon Placeholder ──────────────────────────────────────────────────

function ComingSoonPlaceholder(): React.ReactElement {
  return (
    <div className="p-4 md:p-6 pb-16">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#029bba]" />
          Inquiries Inbox
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Inquiries from buyers interested in your properties
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5 rounded-2xl border border-[#029bba]/20 p-8 md:p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-[#029bba] to-[#004063] rounded-2xl flex items-center justify-center shadow-lg shadow-[#029bba]/20">
          <Rocket className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-black text-[#004063] mb-2">
          Inquiries System Coming Soon
        </h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
          We&apos;re building an enterprise-grade inquiries inbox that will let
          you manage all buyer inquiries from a single dashboard.
        </p>

        {/* Feature list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left mb-8">
          {[
            { icon: Zap,         text: "Real-time inquiry notifications" },
            { icon: Thermometer, text: "Auto-scored hot/warm/cold leads" },
            { icon: Bot,         text: "Aleem AI conversation history" },
            { icon: Target,      text: "Priority-based lead management" },
            { icon: Phone,       text: "One-tap call & WhatsApp actions" },
            { icon: Download,    text: "Export inquiries to CSV" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100"
            >
              <div className="w-8 h-8 rounded-lg bg-[#029bba]/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#029bba]" />
              </div>
              <span className="text-sm text-gray-700 font-medium">{text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/owner/listings"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
          >
            <Home className="w-4 h-4" />
            Manage My Listings
          </Link>
          <Link
            href="/owner/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You&apos;ll be notified via email as soon as the inquiries system goes live.
        </p>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function LeadsContent(): React.ReactElement {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);

  const [stats, setStats] = useState<LeadStats>({
    all: 0, new: 0, contacted: 0, qualified: 0, won: 0, conversionRate: 0,
  });

  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 12, total: 0, totalPages: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter]     = useState("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Banner
  const [banner, setBanner] = useState<BannerState | null>(null);
  const bannerTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((type: BannerState["type"], message: string) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const query = new URLSearchParams({
        page:   String(pagination.page),
        limit:  String(pagination.limit),
        status: statusFilter,
        search: debouncedSearch,
      });

      const res = await fetch(`/api/owner/leads?${query.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        setLeads([]);
        return;
      }

      const data = (await res.json()) as {
        success:     boolean;
        data?:       Lead[];
        stats?:      Partial<LeadStats>;
        pagination?: { total?: number; totalPages?: number };
        _info?:      string;
      };

      // Detect Coming Soon signal from API
      if (data._info?.includes("not yet available")) {
        setComingSoon(true);
        return;
      }

      if (data.success) {
        setLeads(data.data ?? []);
        setStats((prev) => ({ ...prev, ...(data.stats ?? {}) }));
        setPagination((prev) => ({
          ...prev,
          total:      data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 0,
        }));
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  // ── CSV Export ─────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (leads.length === 0) {
      showBanner("warning", "No inquiries to export");
      return;
    }
    if (typeof window === "undefined") return;

    try {
      const rows = [
        ["Name", "Email", "Phone", "Property", "Location", "Status", "Score", "Temperature", "Date"],
        ...leads.map((l) => [
          l.name,
          l.email,
          l.phone,
          getEntityName(l),
          getEntityLocation(l),
          l.status ?? "new",
          l.leadScore ?? 0,
          l.temperature ?? "",
          formatDate(l.createdAt),
        ]),
      ];

      const csvContent = rows
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `inquiries_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showBanner("success", "CSV exported successfully");
    } catch {
      showBanner("error", "Failed to export CSV");
    }
  }, [leads, showBanner]);

  // ── Pagination ─────────────────────────────────────────────────────────
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page }));
    }
  }, [pagination.totalPages]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading inquiries...</p>
      </div>
    );
  }

  // ── Coming Soon fallback ───────────────────────────────────────────────
  if (comingSoon) {
    return <ComingSoonPlaceholder />;
  }

  const hasFilters = statusFilter !== "all" || searchQuery !== "";

  return (
    <>
      {detailLead && (
        <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} />
      )}

      {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}

      <div className="p-4 md:p-6 pb-16">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#029bba]" />
              Inquiries Inbox
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Buyer inquiries received on your properties
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchLeads(true)}
              disabled={refreshing}
              className="p-2.5 text-gray-500 hover:text-[#029bba] bg-white border border-gray-200 rounded-xl transition-colors disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total",     val: stats.all,       icon: Users,        color: "bg-[#029bba]/10 text-[#029bba]" },
            { label: "New",       val: stats.new,       icon: Flame,        color: "bg-orange-50 text-orange-600" },
            { label: "Qualified", val: stats.qualified, icon: Target,       color: "bg-violet-50 text-violet-600" },
            { label: "Won",       val: `${stats.conversionRate}%`, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{s.val}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────── */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] text-sm transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-[#029bba]/20"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Table / Cards ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {leads.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Buyer</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Score</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Received</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map((lead) => {
                      const tempCfg   = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;
                      const statusCfg = STATUS_CONFIG[lead.status ?? "new"] ?? STATUS_CONFIG.new;
                      const isAleem   = isAleemLead(lead);

                      return (
                        <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-gray-900 text-sm truncate max-w-[140px]">{lead.name}</p>
                                  {isAleem && <Bot className="w-3.5 h-3.5 text-[#029bba] shrink-0" />}
                                </div>
                                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[160px]">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  {lead.phone}
                                </p>
                                {tempCfg && (
                                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tempCfg.bg} ${tempCfg.text} ${tempCfg.border}`}>
                                    <Thermometer className="w-2.5 h-2.5" /> {tempCfg.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <p className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">
                              {getEntityName(lead)}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {getEntityLocation(lead)}
                            </p>
                          </td>

                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    (lead.leadScore ?? 0) > 75 ? "bg-emerald-500" :
                                    (lead.leadScore ?? 0) > 40 ? "bg-orange-400" : "bg-gray-400"
                                  }`}
                                  style={{ width: `${lead.leadScore ?? 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-700">{lead.leadScore ?? 0}</span>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {timeAgo(lead.createdAt)}
                            </div>
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`tel:${lead.phone}`}
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Call"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-emerald-50 rounded-lg transition-colors"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setDetailLead(lead)}
                                className="p-2 text-gray-400 hover:text-[#029bba] hover:bg-[#029bba]/5 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {leads.map((lead) => {
                  const tempCfg   = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;
                  const statusCfg = STATUS_CONFIG[lead.status ?? "new"] ?? STATUS_CONFIG.new;
                  const isAleem   = isAleemLead(lead);

                  return (
                    <div key={lead._id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] text-white flex items-center justify-center font-bold shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm">{lead.name}</p>
                            {isAleem && <Bot className="w-3.5 h-3.5 text-[#029bba]" />}
                            {tempCfg && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tempCfg.bg} ${tempCfg.text} ${tempCfg.border}`}>
                                <Thermometer className="w-2.5 h-2.5" /> {tempCfg.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {getEntityName(lead)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(lead.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-3">
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> WA
                            </a>
                            <button
                              type="button"
                              onClick={() => setDetailLead(lead)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#029bba]/10 text-[#029bba] rounded-lg text-xs font-bold hover:bg-[#029bba]/20 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // ── Empty state ────────────────────────────────────────────
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {hasFilters ? "No inquiries match your filters" : "No inquiries yet"}
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {hasFilters
                  ? "Try clearing your filters to see all inquiries."
                  : "When buyers inquire about your properties, they will appear here."}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  href="/owner/listings"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Manage My Listings
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-bold text-gray-700">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>
                {" – "}
                <span className="font-bold text-gray-700">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>
                {" of "}
                <span className="font-bold text-gray-700">
                  {pagination.total.toLocaleString()}
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-700 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function OwnerLeadsPage(): React.ReactElement {
  return (
    <>
      <Head>
        <title>Inquiries | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <OwnerLayout>
        <LeadsContent />
      </OwnerLayout>
    </>
  );
}