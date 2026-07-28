// ========== FILE: pages/agent/leads/index.tsx ==========
// Agent Leads Management — Enterprise Redesign V6.4.3
// Features: status/priority dropdowns, detail modal, CSV export,
//           temperature badges, Aleem AI indicator, null-safe helpers
// =======================================================

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Users, Phone, Mail, Search, Download, Loader2, Eye,
  ChevronLeft, ChevronRight, ChevronDown, AlertCircle,
  CheckCircle2, RefreshCw, Clock, Target, Flame, MessageSquare,
  XCircle, PhoneCall, CalendarCheck, FileText, X, MapPin,
  Bot, Thermometer, User, Building2, Star,
} from "lucide-react";
import AgentLayout from "@/components/agent/AgentLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectSnapshot {
  _id?:         string;
  projectName?: string;
  slug?:        string;
  city?:        string;
  area?:        string;
  primaryImage?: string;
  minPrice?:    number;
  maxPrice?:    number;
}

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
  leadType:          string;
  entityType?:       "project" | "property" | "unit";
  projectSnapshot?:  ProjectSnapshot;
  propertySnapshot?: PropertySnapshot;
  leadScore:         number;
  priority:          "low" | "medium" | "high" | "urgent";
  status:            string;
  source?:           string;
  temperature?:      "cold" | "warm" | "hot" | "burning";
  conversationId?:   string;
  sessionId?:        string;
  isArchived:        boolean;
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
  label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  new:                   { label: "New",            color: "text-blue-700",   bg: "bg-blue-100",   icon: Flame },
  contacted:             { label: "Contacted",      color: "text-violet-700", bg: "bg-violet-100", icon: PhoneCall },
  qualified:             { label: "Qualified",      color: "text-orange-700", bg: "bg-orange-100", icon: Target },
  site_visit_scheduled:  { label: "Scheduled",      color: "text-indigo-700", bg: "bg-indigo-100", icon: CalendarCheck },
  proposal_sent:         { label: "Proposal",       color: "text-cyan-700",   bg: "bg-cyan-100",   icon: FileText },
  negotiation:           { label: "Negotiating",    color: "text-amber-700",  bg: "bg-amber-100",  icon: MessageSquare },
  won:                   { label: "Won",            color: "text-emerald-700",bg: "bg-emerald-100",icon: CheckCircle2 },
  lost:                  { label: "Lost",           color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
  nurture:               { label: "Nurture",        color: "text-gray-700",   bg: "bg-gray-100",   icon: Clock },
};

const PRIORITY_CONFIG: Record<string, {
  label: string; color: string; bg: string; dot: string;
}> = {
  low:    { label: "Low",    color: "text-gray-600",   bg: "bg-gray-100",   dot: "#6b7280" },
  medium: { label: "Medium", color: "text-blue-600",   bg: "bg-blue-50",    dot: "#3b82f6" },
  high:   { label: "High",   color: "text-orange-600", bg: "bg-orange-50",  dot: "#f97316" },
  urgent: { label: "Urgent", color: "text-red-600",    bg: "bg-red-50",     dot: "#ef4444" },
};

const TEMP_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  cold:    { label: "Cold",    bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  warm:    { label: "Warm",    bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
  hot:     { label: "Hot",     bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  burning: { label: "Burning", bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200" },
};

// ─── Null-Safe Helpers ────────────────────────────────────────────────────────

function getEntityName(lead: Lead): string {
  return lead.propertySnapshot?.title
    ?? lead.projectSnapshot?.projectName
    ?? "General Inquiry";
}

function getEntityLocation(lead: Lead): string {
  if (lead.projectSnapshot?.city) {
    return `${lead.projectSnapshot.area ?? ""}, ${lead.projectSnapshot.city}`.replace(/^, /, "");
  }
  if (lead.propertySnapshot?.city) {
    return lead.propertySnapshot.society
      ? `${lead.propertySnapshot.society}, ${lead.propertySnapshot.city}`
      : lead.propertySnapshot.city;
  }
  return "—";
}

function getEntityImage(lead: Lead): string | null {
  return lead.projectSnapshot?.primaryImage
    ?? lead.propertySnapshot?.primaryImage
    ?? null;
}

function isAleemLead(lead: Lead): boolean {
  return lead.source === "direct" && Boolean(lead.conversationId ?? lead.sessionId);
}

// ─── Formatters ───────────────────────────────────────────────────────────────

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
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
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
        backdrop-blur-sm max-w-sm w-full
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

// ─── Status Dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({
  lead, onUpdate,
}: {
  lead:     Lead;
  onUpdate: (id: string, status: string) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef          = useRef<HTMLButtonElement>(null);
  const cfg             = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
  const Icon            = cfg.icon;

  const toggle = () => {
    if (!open && btnRef.current) {
      const r     = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setPos({
        top:  below < 380 ? r.top - 380 - 8 : r.bottom + 8,
        left: r.left,
      });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold hover:border-[#029bba] transition-all min-w-[130px] ${cfg.color}`}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[999] w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 overflow-y-auto max-h-[380px]"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 sticky top-0 bg-white">
              Change Status
            </p>
            {Object.entries(STATUS_CONFIG).map(([key, c]) => {
              const ItemIcon = c.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onUpdate(lead._id, key);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 ${
                    lead.status === key
                      ? "bg-[#029bba]/5 font-bold text-[#029bba]"
                      : "text-gray-700"
                  }`}
                >
                  <ItemIcon className="w-4 h-4 flex-shrink-0" />
                  {c.label}
                  {lead.status === key && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#029bba] ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ─── Priority Dropdown ────────────────────────────────────────────────────────

function PriorityDropdown({
  lead, onUpdate,
}: {
  lead:     Lead;
  onUpdate: (id: string, priority: string) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef          = useRef<HTMLButtonElement>(null);
  const cfg             = PRIORITY_CONFIG[lead.priority] ?? PRIORITY_CONFIG.medium;

  const toggle = () => {
    if (!open && btnRef.current) {
      const r     = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setPos({
        top:  below < 240 ? r.top - 240 - 8 : r.bottom + 8,
        left: r.left,
      });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${cfg.bg} ${cfg.color} ${
          open ? "ring-2 ring-[#029bba]" : "border-transparent"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
        {cfg.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[999] w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              Change Priority
            </p>
            {(["urgent", "high", "medium", "low"] as const).map((p) => {
              const c = PRIORITY_CONFIG[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onUpdate(lead._id, p);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 ${
                    lead.priority === p
                      ? "bg-[#029bba]/5 font-bold text-[#029bba]"
                      : "text-gray-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
                  {c.label}
                  {lead.priority === p && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#029bba] ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
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
  const entityImage    = getEntityImage(lead);
  const tempCfg        = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;
  const statusCfg      = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
  const priorityCfg    = PRIORITY_CONFIG[lead.priority] ?? PRIORITY_CONFIG.medium;
  const StatusIcon     = statusCfg.icon;

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
              Lead ID: {lead._id.slice(-8)}
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

          {/* Score + Priority + Status Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Lead Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      lead.leadScore >= 80 ? "bg-emerald-500" :
                      lead.leadScore >= 60 ? "bg-orange-500" :
                      lead.leadScore >= 40 ? "bg-amber-500" : "bg-gray-400"
                    }`}
                    style={{ width: `${lead.leadScore}%` }}
                  />
                </div>
                <span className="text-xl font-black text-gray-900">{lead.leadScore}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Priority</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${priorityCfg.bg} ${priorityCfg.color}`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityCfg.dot }} />
                {priorityCfg.label}
              </span>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#029bba]" /> Contact Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="font-semibold text-[#029bba] hover:underline flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-gray-400" /> {lead.email}
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Phone</p>
                <a
                  href={`tel:${lead.phone}`}
                  className="font-semibold text-[#029bba] hover:underline flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-gray-400" /> {lead.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Entity Info */}
          {(lead.projectSnapshot ?? lead.propertySnapshot) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#029bba]" />
                {lead.projectSnapshot ? "Project Details" : "Property Details"}
              </h4>
              <div className="flex items-start gap-4">
                {entityImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entityImage}
                    alt={entityName}
                    className="w-20 h-20 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-gray-900 text-base">{entityName}</h5>
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {entityLocation}
                  </p>
                  {lead.propertySnapshot?.price && (
                    <p className="text-sm font-bold text-[#029bba] mt-1.5">
                      PKR {lead.propertySnapshot.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aleem AI Info */}
          {isAleemLead(lead) && (
            <div className="bg-[#029bba]/5 rounded-2xl border border-[#029bba]/20 p-5">
              <h4 className="text-sm font-bold text-[#004063] mb-2 flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#029bba]" /> Aleem AI Lead
              </h4>
              <p className="text-xs text-gray-600">
                This lead was captured through the Aleem AI chatbot conversation.
              </p>
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
          <div className="grid grid-cols-2 gap-4 text-sm">
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
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" /> Call Now
            </a>
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" /> Send Email
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

// ─── Main Content ─────────────────────────────────────────────────────────────

function LeadsContent(): React.ReactElement {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<LeadStats>({
    all: 0, new: 0, contacted: 0, qualified: 0, won: 0, conversionRate: 0,
  });

  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 12, total: 0, totalPages: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter]     = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
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

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const query = new URLSearchParams({
        page:     String(pagination.page),
        limit:    String(pagination.limit),
        status:   statusFilter,
        priority: priorityFilter,
        search:   debouncedSearch,
      });

      const res = await fetch(`/api/leads?${query.toString()}`, {
        credentials: "include",
      });

      // Graceful degradation
      if (res.status === 404) {
        setLeads([]);
        return;
      }

      const data = (await res.json()) as {
        success:     boolean;
        data?:       Lead[];
        stats?:      Partial<LeadStats>;
        pagination?: { total?: number; totalPages?: number };
      };

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
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, debouncedSearch]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  // ── Update handlers ─────────────────────────────────────────────────────────
  const handleUpdate = async (id: string, field: "status" | "priority", value: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        showBanner("success", `Lead ${field} updated successfully`);
        void fetchLeads(true);
      } else {
        showBanner("error", "Failed to update lead");
      }
    } catch {
      showBanner("error", "Network error updating lead");
    }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (leads.length === 0) {
      showBanner("warning", "No leads to export");
      return;
    }
    if (typeof window === "undefined") return;

    try {
      const rows = [
        ["Name", "Email", "Phone", "Listing", "Location", "Status", "Priority", "Temperature", "Score", "Date"],
        ...leads.map((l) => [
          l.name,
          l.email,
          l.phone,
          getEntityName(l),
          getEntityLocation(l),
          l.status,
          l.priority,
          l.temperature ?? "",
          l.leadScore,
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
      link.setAttribute("download", `leads_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showBanner("success", "CSV exported successfully");
    } catch {
      showBanner("error", "Failed to export CSV");
    }
  };

  // ── Pagination ──────────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading inquiries...</p>
      </div>
    );
  }

  return (
    <>
      {/* Modal */}
      {detailLead && (
        <LeadDetailModal lead={detailLead} onClose={() => setDetailLead(null)} />
      )}

      {/* Banner */}
      {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}

      <div className="p-4 md:p-6 pb-16">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#029bba]" />
              Leads Inbox
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage inquiries for your properties
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLeads(true)}
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
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Leads", val: stats.all,       icon: Users,        color: "bg-[#029bba]/10 text-[#029bba]" },
            { label: "New",         val: stats.new,       icon: Flame,        color: "bg-orange-50 text-orange-600" },
            { label: "Qualified",   val: stats.qualified, icon: Target,       color: "bg-violet-50 text-violet-600" },
            { label: "Conversion",  val: `${stats.conversionRate}%`, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
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

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone or listing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] text-sm transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-[#029bba]/20"
              >
                <option value="all">All Priorities</option>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Listing</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Score</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => {
                    const tempCfg = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;
                    const isAleem = isAleemLead(lead);

                    return (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors group">
                        {/* Customer */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-gray-900 text-sm truncate max-w-[140px]">{lead.name}</p>
                                {isAleem && <Bot className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />}
                              </div>
                              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[160px]">
                                <Phone className="w-3 h-3 flex-shrink-0" />
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

                        {/* Listing */}
                        <td className="px-6 py-3.5">
                          <p className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">
                            {getEntityName(lead)}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {getEntityLocation(lead)}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          <StatusDropdown lead={lead} onUpdate={(id, val) => handleUpdate(id, "status", val)} />
                        </td>

                        {/* Priority */}
                        <td className="px-6 py-3.5">
                          <PriorityDropdown lead={lead} onUpdate={(id, val) => handleUpdate(id, "priority", val)} />
                        </td>

                        {/* Score */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  lead.leadScore > 75 ? "bg-emerald-500" :
                                  lead.leadScore > 40 ? "bg-orange-400" : "bg-gray-400"
                                }`}
                                style={{ width: `${lead.leadScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700">{lead.leadScore}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {timeAgo(lead.createdAt)}
                          </div>
                        </td>

                        {/* Actions */}
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
                              href={`mailto:${lead.email}`}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Email"
                            >
                              <Mail className="w-4 h-4" />
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
          ) : (
            // ── Empty state ─────────────────────────────────────────
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No leads found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {statusFilter !== "all" || priorityFilter !== "all" || searchQuery
                  ? "Try adjusting your filters to see more results."
                  : "New inquiries from property pages will appear here."}
              </p>
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

export default function AgentLeadsPage(): React.ReactElement {
  return (
    <AgentLayout
      title="Leads Inbox | Highrise.pk"
      description="Manage leads and inquiries on Highrise.pk"
    >
      <LeadsContent />
    </AgentLayout>
  );
}

// ========== END OF FILE ==========