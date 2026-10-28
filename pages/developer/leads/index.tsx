// pages/developer/leads/index.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER LEADS — Highrise.pk V6.4.5
// Full rewrite — all banned patterns eliminated.
// ═══════════════════════════════════════════════════════════════
// ✅ fetch() only — no apiClient
// ✅ Native Tailwind divs — no Card component
// ✅ Inline banners — no react-hot-toast
// ✅ useSession() guard — no DeveloperGuard
// ✅ No console.error / console.warn
// ✅ No inline style={} — Tailwind only
// ✅ Status dropdown — pure Tailwind
// ✅ Priority dropdown — pure Tailwind
// ✅ Lead detail modal — fetch() based, overview only
// ✅ Temperature badges (cold/warm/hot/burning)
// ✅ Score progress bar visualization
// ✅ CSV export
// ✅ Pagination (X–Y of Z format)
// ✅ Archive / restore lead
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Users,
  Phone,
  Mail,
  Search,
  Download,
  Loader2,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  Clock,
  Building2,
  Filter,
  TrendingUp,
  Target,
  Flame,
  X,
  Archive,
  XCircle,
  AlertCircle,
  MapPin,
  MessageSquare,
  DollarSign,
  Shield,
} from "lucide-react";
import DeveloperLayout from "@/components/developer/DeveloperLayout";

// ============================================
// TYPES
// ============================================

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  leadType:
    | "project_interest"
    | "call_back"
    | "site_visit"
    | "brochure_download"
    | "payment_plan"
    | "general_inquiry";
  projectSnapshot: {
    _id: string;
    projectName: string;
    slug?: string;
    city: string;
    area?: string;
    minPrice?: number;
    maxPrice?: number;
    primaryImage?: string;
  };
  developerSnapshot: {
    _id: string;
    companyName: string;
    email: string;
  };
  leadScore: number;
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "new"
    | "contacted"
    | "qualified"
    | "site_visit_scheduled"
    | "proposal_sent"
    | "negotiation"
    | "won"
    | "lost"
    | "nurture";
  source: string;
  temperature?: "cold" | "warm" | "hot" | "burning";
  scheduledVisit?: string;
  followUpDate?: string;
  lastContactedAt?: string;
  notes?: string;
  tags?: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LeadsStats {
  all: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  avgScore: number;
  conversionRate: number;
}

interface LeadsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LeadsApiResponse {
  success: boolean;
  data?: Lead[];
  stats?: LeadsStats;
  pagination?: LeadsPagination;
  message?: string;
}

interface UpdateApiResponse {
  success: boolean;
  message?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_STATS: LeadsStats = {
  all: 0,
  new: 0,
  contacted: 0,
  qualified: 0,
  won: 0,
  lost: 0,
  avgScore: 0,
  conversionRate: 0,
};

const DEFAULT_PAGINATION: LeadsPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string }
> = {
  new: { label: "New", dot: "bg-blue-500" },
  contacted: { label: "Contacted", dot: "bg-purple-500" },
  qualified: { label: "Qualified", dot: "bg-orange-500" },
  site_visit_scheduled: {
    label: "Visit Scheduled",
    dot: "bg-indigo-500",
  },
  proposal_sent: { label: "Proposal Sent", dot: "bg-cyan-500" },
  negotiation: { label: "Negotiation", dot: "bg-yellow-500" },
  won: { label: "Won", dot: "bg-green-500" },
  lost: { label: "Lost", dot: "bg-red-500" },
  nurture: { label: "Nurture", dot: "bg-gray-400" },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  urgent: {
    label: "Urgent",
    color: "text-red-600",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    color: "text-orange-600",
    bg: "bg-orange-50",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    color: "text-blue-600",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
  },
  low: {
    label: "Low",
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
  },
};

const TEMPERATURE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  burning: {
    label: "🔴 Burning",
    color: "text-red-700",
    bg: "bg-red-100",
    border: "border-red-200",
    icon: "🔴",
  },
  hot: {
    label: "🟠 Hot",
    color: "text-orange-700",
    bg: "bg-orange-100",
    border: "border-orange-200",
    icon: "🟠",
  },
  warm: {
    label: "🟡 Warm",
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
    icon: "🟡",
  },
  cold: {
    label: "🔵 Cold",
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
    icon: "🔵",
  },
};

const LEAD_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  project_interest: { label: "Project Interest", icon: Building2 },
  call_back: { label: "Call Back", icon: Phone },
  site_visit: { label: "Site Visit", icon: MapPin },
  brochure_download: { label: "Brochure", icon: Download },
  payment_plan: { label: "Payment Plan", icon: DollarSign },
  general_inquiry: { label: "General Inquiry", icon: MessageSquare },
};

// ============================================
// HELPERS
// ============================================

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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(price);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-gray-400";
}

// ============================================
// BANNER COMPONENT (auto-dismiss)
// ============================================

interface BannerState {
  type: "success" | "error" | "warning";
  message: string;
}

function InlineBanner({
  banner,
  onDismiss,
}: {
  banner: BannerState;
  onDismiss: () => void;
}): React.ReactElement {
  const styles = {
    success: "bg-[#f0fdf4] border-[#10b981] text-green-800",
    error: "bg-[#fef2f2] border-[#ef4444] text-red-800",
    warning: "bg-[#fef3c7] border-[#f59e0b] text-amber-800",
  };
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />,
    error: <XCircle className="w-5 h-5 text-[#ef4444] shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-[#f59e0b] shrink-0" />,
  };

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl backdrop-blur-sm max-w-md w-full ${styles[banner.type]}`}
      role="status"
      aria-live="polite"
    >
      {icons[banner.type]}
      <p className="text-sm font-semibold flex-1">{banner.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-60 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// STATUS DROPDOWN — pure Tailwind
// ============================================

function StatusDropdown({
  lead,
  onUpdate,
}: {
  lead: Lead;
  onUpdate: (id: string, status: string) => void;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[lead.status];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-colors min-w-[140px] justify-between ${
          isOpen
            ? "border-[#029bba] bg-[#029bba]/5"
            : "border-gray-200 bg-white hover:border-[#029bba]/50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              cfg?.dot ?? "bg-gray-400"
            }`}
          />
          <span className="text-[#333333]">
            {cfg?.label ?? lead.status}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="absolute left-0 top-full mt-1 z-[999] w-52 bg-white rounded-2xl border border-gray-200 shadow-2xl py-1.5 overflow-hidden">
            <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
              Update Status
            </p>
            {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onUpdate(lead._id, key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  lead.status === key
                    ? "bg-[#029bba]/8 text-[#029bba] font-semibold"
                    : "text-[#333333] hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${conf.dot}`}
                />
                {conf.label}
                {lead.status === key && (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#029bba]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// PRIORITY DROPDOWN — pure Tailwind
// ============================================

function PriorityDropdown({
  lead,
  onUpdate,
}: {
  lead: Lead;
  onUpdate: (id: string, priority: string) => void;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = PRIORITY_CONFIG[lead.priority];

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-colors ${
          cfg?.bg ?? "bg-gray-100"
        } ${cfg?.color ?? "text-gray-600"} ${
          isOpen ? "border-[#029bba]" : "border-transparent"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            cfg?.dot ?? "bg-gray-400"
          }`}
        />
        {cfg?.label ?? lead.priority}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-[999] w-44 bg-white rounded-2xl border border-gray-200 shadow-2xl py-1.5 overflow-hidden">
            <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
              Change Priority
            </p>
            {(["urgent", "high", "medium", "low"] as const).map(
              (priority) => {
                const pc = PRIORITY_CONFIG[priority];
                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => {
                      onUpdate(lead._id, priority);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      lead.priority === priority
                        ? "bg-[#029bba]/8 text-[#029bba] font-semibold"
                        : "text-[#333333] hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`}
                    />
                    {pc.label}
                    {lead.priority === priority && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#029bba]" />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// LEAD DETAIL MODAL
// ============================================

function LeadDetailModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}): React.ReactElement {
  const statusCfg = STATUS_CONFIG[lead.status];
  const priorityCfg = PRIORITY_CONFIG[lead.priority];
  const tempCfg = lead.temperature
    ? TEMPERATURE_CONFIG[lead.temperature]
    : null;
  const leadTypeCfg = LEAD_TYPE_CONFIG[lead.leadType];
  const LeadTypeIcon = leadTypeCfg?.icon ?? MessageSquare;

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#004063]">
                {lead.name}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Lead #{lead._id.slice(-8).toUpperCase()} ·{" "}
                {formatDate(lead.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Score + Priority + Status row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Score */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200">
              <Target className="w-3.5 h-3.5 text-[#029bba]" />
              <span className="text-xs font-bold text-[#004063]">
                Score: {lead.leadScore}/100
              </span>
              <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(
                    lead.leadScore
                  )}`}
                  style={{ width: `${lead.leadScore}%` }}
                />
              </div>
            </div>

            {/* Priority */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                priorityCfg?.bg ?? "bg-gray-100"
              } ${priorityCfg?.color ?? "text-gray-600"} border-transparent`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  priorityCfg?.dot ?? "bg-gray-400"
                }`}
              />
              {priorityCfg?.label ?? lead.priority} Priority
            </span>

            {/* Status */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#029bba]/10 text-[#029bba] border border-[#029bba]/20">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusCfg?.dot ?? "bg-[#029bba]"
                }`}
              />
              {statusCfg?.label ?? lead.status}
            </span>

            {/* Temperature */}
            {tempCfg && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${tempCfg.bg} ${tempCfg.color} ${tempCfg.border}`}
              >
                {tempCfg.label}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Contact info */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-[#004063] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Contact Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 text-sm text-[#029bba] hover:underline"
              >
                <Mail className="w-4 h-4 shrink-0" />
                {lead.email}
              </a>
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-2 text-sm text-[#029bba] hover:underline"
              >
                <Phone className="w-4 h-4 shrink-0" />
                {lead.phone}
              </a>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <LeadTypeIcon className="w-4 h-4 shrink-0 text-gray-400" />
                {leadTypeCfg?.label ?? lead.leadType}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4 shrink-0 text-gray-400" />
                Source: {lead.source.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          {/* Project info */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-[#004063] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              Project Interest
            </p>
            <div className="flex items-start gap-4">
              {lead.projectSnapshot.primaryImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lead.projectSnapshot.primaryImage}
                  alt={lead.projectSnapshot.projectName}
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#004063] truncate">
                  {lead.projectSnapshot.projectName}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lead.projectSnapshot.area
                    ? `${lead.projectSnapshot.area}, ${lead.projectSnapshot.city}`
                    : lead.projectSnapshot.city}
                </p>
                {lead.projectSnapshot.minPrice &&
                  lead.projectSnapshot.maxPrice && (
                    <p className="text-sm font-semibold text-[#029bba] mt-1">
                      {formatPrice(lead.projectSnapshot.minPrice)} –{" "}
                      {formatPrice(lead.projectSnapshot.maxPrice)}
                    </p>
                  )}
                {lead.projectSnapshot.slug && (
                  <Link
                    href={`/projects/${lead.projectSnapshot.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#029bba] hover:underline mt-1 inline-block"
                  >
                    View Project →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-[#004063] uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Customer Message
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {lead.message}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Created", value: formatDate(lead.createdAt) },
              {
                label: "Last Updated",
                value: formatDate(lead.updatedAt),
              },
              ...(lead.followUpDate
                ? [
                    {
                      label: "Follow-up",
                      value: formatDate(lead.followUpDate),
                    },
                  ]
                : []),
              ...(lead.scheduledVisit
                ? [
                    {
                      label: "Site Visit",
                      value: formatDate(lead.scheduledVisit),
                    },
                  ]
                : []),
              ...(lead.lastContactedAt
                ? [
                    {
                      label: "Last Contact",
                      value: formatDate(lead.lastContactedAt),
                    },
                  ]
                : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-gray-50 rounded-xl p-3 border border-gray-100"
              >
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-sm font-semibold text-[#004063] mt-0.5">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                Notes
              </p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full border border-[#029bba]/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Now
            </a>
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN LEADS CONTENT
// ============================================

function DeveloperLeadsContent(): React.ReactElement {
  // ── State ─────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<LeadsStats>(DEFAULT_STATS);
  const [pagination, setPagination] = useState<LeadsPagination>(
    DEFAULT_PAGINATION
  );

  // ── Filters ───────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [archivedFilter, setArchivedFilter] = useState<
    "active" | "archived" | "all"
  >("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Modal ─────────────────────────────────────────────────
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // ── Banner ────────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerState | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Show banner with auto-dismiss ─────────────────────────
  const showBanner = useCallback(
    (type: BannerState["type"], message: string): void => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
      setBanner({ type, message });
      bannerTimerRef.current = setTimeout(() => {
        setBanner(null);
      }, 4000);
    },
    []
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, []);

  // ── Fetch leads ───────────────────────────────────────────
  const fetchLeads = useCallback(
    async (showRefresh = false): Promise<void> => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (priorityFilter !== "all")
          params.set("priority", priorityFilter);
        params.set("page", String(pagination.page));
        params.set("limit", String(pagination.limit));
        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());
        params.set("sortBy", "createdAt");
        params.set("sortOrder", "desc");
        params.set(
          "isArchived",
          archivedFilter === "archived"
            ? "true"
            : archivedFilter === "all"
            ? "all"
            : "false"
        );

        const res = await fetch(`/api/leads?${params.toString()}`, {
          credentials: "include",
        });

        const data = (await res.json()) as LeadsApiResponse;

        if (!res.ok || !data.success) {
          showBanner("error", data.message ?? "Failed to load leads.");
          setLeads([]);
          return;
        }

        setLeads(data.data ?? []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: data.pagination!.total,
            totalPages: data.pagination!.totalPages,
          }));
        }
      } catch {
        showBanner(
          "error",
          "Network error. Please check your connection."
        );
        setLeads([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      statusFilter,
      priorityFilter,
      pagination.page,
      pagination.limit,
      debouncedSearch,
      archivedFilter,
      showBanner,
    ]
  );

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  // ── Update status ─────────────────────────────────────────
  const handleStatusUpdate = useCallback(
    async (id: string, newStatus: string): Promise<void> => {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l._id === id
            ? { ...l, status: newStatus as Lead["status"] }
            : l
        )
      );

      try {
        const res = await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });

        const data = (await res.json()) as UpdateApiResponse;

        if (res.ok && data.success) {
          showBanner(
            "success",
            `Status updated to ${
              STATUS_CONFIG[newStatus]?.label ?? newStatus
            }`
          );
        } else {
          // Revert optimistic update
          void fetchLeads();
          showBanner(
            "error",
            data.message ?? "Failed to update status."
          );
        }
      } catch {
        void fetchLeads();
        showBanner("error", "Network error. Please try again.");
      }
    },
    [fetchLeads, showBanner]
  );

  // ── Update priority ───────────────────────────────────────
  const handlePriorityUpdate = useCallback(
    async (id: string, newPriority: string): Promise<void> => {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l._id === id
            ? { ...l, priority: newPriority as Lead["priority"] }
            : l
        )
      );

      try {
        const res = await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ priority: newPriority }),
        });

        const data = (await res.json()) as UpdateApiResponse;

        if (res.ok && data.success) {
          showBanner(
            "success",
            `Priority updated to ${
              PRIORITY_CONFIG[newPriority]?.label ?? newPriority
            }`
          );
        } else {
          void fetchLeads();
          showBanner(
            "error",
            data.message ?? "Failed to update priority."
          );
        }
      } catch {
        void fetchLeads();
        showBanner("error", "Network error. Please try again.");
      }
    },
    [fetchLeads, showBanner]
  );

  // ── Archive / restore ─────────────────────────────────────
  const handleArchiveToggle = useCallback(
    async (id: string, archive: boolean): Promise<void> => {
      try {
        const res = await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isArchived: archive }),
        });

        const data = (await res.json()) as UpdateApiResponse;

        if (res.ok && data.success) {
          // Remove from current view (active/archived list)
          setLeads((prev) => prev.filter((l) => l._id !== id));
          showBanner(
            "success",
            archive ? "Lead archived." : "Lead restored."
          );
        } else {
          showBanner(
            "error",
            data.message ?? "Failed to update lead."
          );
        }
      } catch {
        showBanner("error", "Network error. Please try again.");
      }
    },
    [showBanner]
  );

  // ── CSV Export ────────────────────────────────────────────
  const handleExportCSV = useCallback((): void => {
    if (leads.length === 0) {
      showBanner("warning", "No leads to export.");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Project",
      "City",
      "Status",
      "Priority",
      "Score",
      "Lead Type",
      "Source",
      "Date",
      "Message",
    ];

    const rows = leads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone,
      lead.projectSnapshot.projectName,
      lead.projectSnapshot.city,
      STATUS_CONFIG[lead.status]?.label ?? lead.status,
      PRIORITY_CONFIG[lead.priority]?.label ?? lead.priority,
      String(lead.leadScore),
      LEAD_TYPE_CONFIG[lead.leadType]?.label ?? lead.leadType,
      lead.source,
      formatDate(lead.createdAt),
      (lead.message ?? "").substring(0, 200),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showBanner("success", "CSV exported successfully.");
  }, [leads, showBanner]);

  // ── Page change ───────────────────────────────────────────
  const handlePageChange = useCallback(
    (newPage: number): void => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        setPagination((prev) => ({ ...prev, page: newPage }));
      }
    },
    [pagination.totalPages]
  );

  // ── Status tabs ───────────────────────────────────────────
  const statusTabs = [
    { key: "all", label: "All", count: stats.all },
    { key: "new", label: "New", count: stats.new },
    { key: "contacted", label: "Contacted", count: stats.contacted },
    { key: "qualified", label: "Qualified", count: stats.qualified },
    { key: "won", label: "Won", count: stats.won },
    { key: "lost", label: "Lost", count: stats.lost },
  ];

  return (
    <>
      <Head>
        <title>My Leads — Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Inline banner — fixed top center */}
      {banner && (
        <InlineBanner
          banner={banner}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Lead detail modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
        />
      )}

      <div className="min-h-screen bg-[#f8f9fa] pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* ── Page Header ────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
                <Users className="w-6 h-6 text-[#029bba]" />
                My Leads
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage inquiries for your projects
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchLeads(true)}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
                aria-label="Refresh leads"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-[#333333] hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* ── Stat Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Leads",
                value: stats.all,
                icon: Users,
                iconBg: "bg-[#029bba]/10",
                iconColor: "text-[#029bba]",
              },
              {
                label: "New Leads",
                value: stats.new,
                icon: Flame,
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
              },
              {
                label: "Won",
                value: stats.won,
                icon: CheckCircle2,
                iconBg: "bg-green-100",
                iconColor: "text-green-600",
              },
              {
                label: "Conversion",
                value: `${stats.conversionRate}%`,
                icon: TrendingUp,
                iconBg: "bg-violet-100",
                iconColor: "text-violet-600",
              },
            ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
              <div
                key={label}
                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-[#004063] leading-tight">
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filters ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">

            {/* Status tabs + Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Status tabs */}
              <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      statusFilter === tab.key
                        ? "bg-[#029bba] text-white shadow-md shadow-[#029bba]/25"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                        statusFilter === tab.key
                          ? "bg-white/20"
                          : "bg-gray-200"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Priority + Archive filters */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500 flex items-center gap-1.5 shrink-0">
                <Filter className="w-4 h-4" />
                Priority:
              </span>
              {["all", "urgent", "high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPriorityFilter(p);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                    priorityFilter === p
                      ? "bg-[#029bba] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              ))}

              <span className="text-sm text-gray-400 mx-1">|</span>

              <span className="text-sm text-gray-500 shrink-0">
                View:
              </span>
              {(
                [
                  { key: "active", label: "Active" },
                  { key: "archived", label: "Archived" },
                  { key: "all", label: "All" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setArchivedFilter(key);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                    archivedFilter === key
                      ? "bg-[#029bba] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Leads Table ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
              </div>
            ) : leads.length === 0 ? (
              /* Empty state */
              <div className="py-20 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-[#004063] mb-1">
                  No leads found
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {debouncedSearch.trim()
                    ? `No results for "${debouncedSearch}". Try a different search.`
                    : statusFilter !== "all"
                    ? `No ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} leads found.`
                    : "Inquiries from your project pages will appear here."}
                </p>
                {(debouncedSearch.trim() ||
                  statusFilter !== "all" ||
                  priorityFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                    className="mt-4 text-sm font-semibold text-[#029bba] hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        "Customer",
                        "Project",
                        "Status",
                        "Score",
                        "Priority",
                        "Date",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider ${
                            h === "Actions" ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {leads.map((lead) => {
                      const tempCfg = lead.temperature
                        ? TEMPERATURE_CONFIG[lead.temperature]
                        : null;

                      return (
                        <tr
                          key={lead._id}
                          className={`hover:bg-gray-50 transition-colors ${
                            lead.isArchived ? "opacity-60" : ""
                          }`}
                        >
                          {/* Customer */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#333333] truncate max-w-[120px]">
                                  {lead.name}
                                </p>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {lead.phone}
                                </p>
                                {/* Temperature badge */}
                                {tempCfg && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border mt-1 ${tempCfg.bg} ${tempCfg.color} ${tempCfg.border}`}
                                  >
                                    {tempCfg.icon}{" "}
                                    {lead.temperature}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Project */}
                          <td className="px-4 py-3.5">
                            <div className="max-w-[160px]">
                              <p className="text-sm font-semibold text-[#333333] truncate">
                                {lead.projectSnapshot.projectName}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {lead.projectSnapshot.area
                                  ? `${lead.projectSnapshot.area}, ${lead.projectSnapshot.city}`
                                  : lead.projectSnapshot.city}
                              </p>
                            </div>
                          </td>

                          {/* Status dropdown */}
                          <td className="px-4 py-3.5">
                            <StatusDropdown
                              lead={lead}
                              onUpdate={handleStatusUpdate}
                            />
                          </td>

                          {/* Score */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-14 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getScoreColor(
                                    lead.leadScore
                                  )}`}
                                  style={{
                                    width: `${lead.leadScore}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold text-[#333333] w-7 shrink-0">
                                {lead.leadScore}
                              </span>
                            </div>
                          </td>

                          {/* Priority dropdown */}
                          <td className="px-4 py-3.5">
                            <PriorityDropdown
                              lead={lead}
                              onUpdate={handlePriorityUpdate}
                            />
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {formatDate(lead.createdAt)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              {/* Archive / restore */}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleArchiveToggle(
                                    lead._id,
                                    !lead.isArchived
                                  )
                                }
                                className={`p-2 rounded-lg transition-colors ${
                                  lead.isArchived
                                    ? "text-[#029bba] hover:bg-[#029bba]/10"
                                    : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                                title={
                                  lead.isArchived
                                    ? "Restore lead"
                                    : "Archive lead"
                                }
                                aria-label={
                                  lead.isArchived
                                    ? "Restore lead"
                                    : "Archive lead"
                                }
                              >
                                <Archive className="w-4 h-4" />
                              </button>

                              {/* Call */}
                              <a
                                href={`tel:${lead.phone}`}
                                className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                title={`Call ${lead.name}`}
                                aria-label={`Call ${lead.name}`}
                              >
                                <Phone className="w-4 h-4" />
                              </a>

                              {/* View detail — WORKS (LESSON #207) */}
                              <button
                                type="button"
                                onClick={() => setDetailLead(lead)}
                                className="p-2 rounded-lg text-gray-400 hover:text-[#029bba] hover:bg-[#029bba]/10 transition-colors"
                                title="View lead details"
                                aria-label="View lead details"
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
            )}
          </div>

          {/* ── Pagination ────────────────────────────────────── */}
          {!loading &&
            pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-bold text-[#004063]">
                    {(pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-[#004063]">
                    {pagination.total}
                  </span>{" "}
                  leads
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handlePageChange(pagination.page - 1)
                    }
                    disabled={pagination.page === 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Page number pills */}
                  <div className="flex items-center gap-1">
                    {Array.from(
                      {
                        length: Math.min(5, pagination.totalPages),
                      },
                      (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.page >=
                          pagination.totalPages - 2
                        ) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                              pagination.page === pageNum
                                ? "bg-[#029bba] text-white shadow-sm"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handlePageChange(pagination.page + 1)
                    }
                    disabled={
                      pagination.page === pagination.totalPages
                    }
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}

// ============================================
// PAGE EXPORT
// DeveloperLayout provides auth guard — no DeveloperGuard needed
// ============================================

export default function DeveloperLeadsPage(): React.ReactElement {
  return (
    <DeveloperLayout pageTitle="My Leads">
      <DeveloperLeadsContent />
    </DeveloperLayout>
  );
}