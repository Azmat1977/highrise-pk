// ========== FILE: pages/admin/leads/index.tsx ==========
// Admin: Lead Management CRM
// V6.4.2 — useSession() guard, fetch(), inline modals, Tailwind only
// Null-safe: projectSnapshot + developerSnapshot are OPTIONAL on model
// Supports: project leads, property leads, Aleem AI leads
// ========================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Users, Phone, Mail, Search, Download, Calendar,
  Trash2, Eye, ChevronLeft, ChevronRight, ChevronDown,
  AlertCircle, CheckCircle2, RefreshCw, Clock, User,
  Building2, Filter, TrendingUp, Target, Flame, Award,
  DollarSign, BarChart3, X, MapPin, MessageSquare, Star,
  XCircle, PhoneCall, CalendarCheck, FileText, Send, Ban,
  Bot, Thermometer, SlidersHorizontal, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Lead {
  _id:      string;
  name:     string;
  email:    string;
  phone:    string;
  cnic?:    string;
  message?: string;

  leadType: string;
  entityType: 'project' | 'property' | 'unit';
  temperature?: 'cold' | 'warm' | 'hot' | 'burning';

  // ALL OPTIONAL — Aleem leads may have none of these
  project?: { _id: string; projectName: string; slug?: string };
  projectSnapshot?: {
    _id?:          string;
    projectName:   string;
    slug?:         string;
    city:          string;
    area:          string;
    minPrice?:     number;
    maxPrice?:     number;
    primaryImage?: string;
  };
  unit?: {
    _id:          string;
    unitNumber:   string;
    floorNumber?: string;
    type?:        string;
  };
  // Property leads
  property?:         { _id: string; title: string; slug?: string };
  propertySnapshot?: {
    _id?:          string;
    title:         string;
    slug?:         string;
    city:          string;
    society?:      string;
    price:         number;
    propertyType?: string;
    listingType?:  string;
    primaryImage?: string;
    ownerName?:    string;
    ownerEmail?:   string;
  };
  // Developer — optional
  developer?:          string;
  developerSnapshot?: {
    _id?:         string;
    companyName:  string;
    email:        string;
    phone?:       string;
    logo?:        string;
  };

  // Aleem AI link
  conversationId?: string;
  sessionId?:      string;

  leadScore:       number;
  priority:        'low' | 'medium' | 'high' | 'urgent';
  status:          string;
  source:          string;
  utmSource?:      string;
  utmMedium?:      string;
  utmCampaign?:    string;

  assignedTo?:     string;
  assignedToRole:  string;
  scheduledVisit?: string;
  followUpDate?:   string;
  lastContactedAt?:string;

  conversionValue?: number;
  wonDate?:         string;
  lostReason?:      string;

  budget?: {
    min?:                number;
    max?:                number;
    tier?:               string;
    paymentPreference?:  string;
    financingRequired?:  boolean;
  };

  timeline?: Array<{
    action:          string;
    performedBy:     string;
    performedByRole: string;
    timestamp:       string;
    notes?:          string;
  }>;

  notes?:               string;
  tags?:                string[];
  isArchived:           boolean;
  pageViewDuration?:    number;
  downloadedBrochure?:  boolean;
  viewedFloorPlan?:     boolean;
  watchedVideo?:        boolean;

  createdAt: string;
  updatedAt: string;
}

interface Stats {
  all:                  number;
  new:                  number;
  contacted:            number;
  qualified:            number;
  site_visit_scheduled: number;
  proposal_sent:        number;
  negotiation:          number;
  won:                  number;
  lost:                 number;
  nurture:              number;
  priority:             { low: number; medium: number; high: number; urgent: number };
  avgScore:             number;
  conversionRate:       number;
  totalRevenue:         number;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

interface EmailLog {
  _id:       string;
  subject:   string;
  message:   string;
  to:        string;
  status:    'sent' | 'failed';
  sentBy:    string;
  sentAt:    string;
  createdAt: string;
}

interface BannerState {
  type:    'success' | 'error' | 'warning';
  message: string;
}

// ── NULL-SAFE ENTITY HELPERS ───────────────────────────────────────────────────
// Aleem leads may have NO projectSnapshot/developerSnapshot/propertySnapshot

function getEntityName(lead: Lead): string {
  return lead.projectSnapshot?.projectName
    ?? lead.propertySnapshot?.title
    ?? lead.project?.projectName
    ?? lead.property?.title
    ?? 'General Inquiry';
}

function getEntityLocation(lead: Lead): string {
  if (lead.projectSnapshot?.city) {
    return `${lead.projectSnapshot.area}, ${lead.projectSnapshot.city}`;
  }
  if (lead.propertySnapshot?.city) {
    return lead.propertySnapshot.society
      ? `${lead.propertySnapshot.society}, ${lead.propertySnapshot.city}`
      : lead.propertySnapshot.city;
  }
  return '—';
}

function getEntityImage(lead: Lead): string | null {
  return lead.projectSnapshot?.primaryImage
    ?? lead.propertySnapshot?.primaryImage
    ?? null;
}

function getDeveloperName(lead: Lead): string {
  return lead.developerSnapshot?.companyName ?? '—';
}

function getDeveloperEmail(lead: Lead): string {
  return lead.developerSnapshot?.email ?? '—';
}

function isAleemLead(lead: Lead): boolean {
  return lead.source === 'direct' && Boolean(lead.conversationId ?? lead.sessionId);
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} Cr`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(1)} Lac`;
  return price.toLocaleString('en-PK');
}

function formatPKR(price: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0,
  }).format(price);
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

// ── Config ─────────────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; dot: string; icon: IconComponent;
}> = {
  new:                   { label: 'New',            color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-400',   icon: Flame },
  contacted:             { label: 'Contacted',       color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-400', icon: PhoneCall },
  qualified:             { label: 'Qualified',       color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400', icon: Target },
  site_visit_scheduled:  { label: 'Visit Scheduled', color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-400', icon: CalendarCheck },
  proposal_sent:         { label: 'Proposal Sent',   color: 'text-cyan-700',   bg: 'bg-cyan-50',   dot: 'bg-cyan-400',   icon: FileText },
  negotiation:           { label: 'Negotiation',     color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-400',  icon: MessageSquare },
  won:                   { label: 'Won',             color: 'text-emerald-700',bg: 'bg-emerald-50',dot: 'bg-emerald-400',icon: CheckCircle2 },
  lost:                  { label: 'Lost',            color: 'text-red-700',    bg: 'bg-red-50',    dot: 'bg-red-400',    icon: XCircle },
  nurture:               { label: 'Nurture',         color: 'text-gray-700',   bg: 'bg-gray-100',  dot: 'bg-gray-400',   icon: Clock },
};

const PRIORITY_CONFIG: Record<string, {
  label: string; color: string; bg: string; dot: string;
}> = {
  low:    { label: 'Low',    color: 'text-gray-600',   bg: 'bg-gray-100',   dot: '#6b7280' },
  medium: { label: 'Medium', color: 'text-blue-600',   bg: 'bg-blue-50',    dot: '#3b82f6' },
  high:   { label: 'High',   color: 'text-orange-600', bg: 'bg-orange-50',  dot: '#f97316' },
  urgent: { label: 'Urgent', color: 'text-red-600',    bg: 'bg-red-50',     dot: '#ef4444' },
};

const TEMP_CONFIG: Record<string, {
  label: string; bg: string; text: string; border: string;
}> = {
  cold:    { label: 'Cold',    bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200' },
  warm:    { label: 'Warm',    bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200' },
  hot:     { label: 'Hot',     bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200' },
  burning: { label: 'Burning', bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200' },
};

const LEAD_TYPE_CONFIG: Record<string, { label: string; icon: IconComponent }> = {
  project_interest: { label: 'Project Interest', icon: Building2 },
  call_back:        { label: 'Call Back',         icon: Phone },
  site_visit:       { label: 'Site Visit',        icon: MapPin },
  brochure_download:{ label: 'Brochure',          icon: Download },
  payment_plan:     { label: 'Payment Plan',      icon: DollarSign },
  general_inquiry:  { label: 'General Inquiry',   icon: MessageSquare },
  property_inquiry: { label: 'Property Inquiry',  icon: Building2 },
  property_viewing: { label: 'Property Viewing',  icon: Eye },
  make_offer:       { label: 'Make Offer',        icon: DollarSign },
  rent_inquiry:     { label: 'Rent Inquiry',      icon: FileText },
};

// ── Banner ─────────────────────────────────────────────────────────────────────

function Banner({
  banner, onClose,
}: {
  banner: BannerState;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500]
      flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border
      backdrop-blur-sm max-w-sm w-full
      ${banner.type === 'success'
        ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
        : banner.type === 'error'
        ? 'bg-red-50/95 border-red-200 text-red-800'
        : 'bg-amber-50/95 border-amber-200 text-amber-800'}`}>
      <span className="text-sm font-semibold flex-1">{banner.message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Status Dropdown ────────────────────────────────────────────────────────────

function StatusDropdown({
  lead, onUpdate,
}: {
  lead:     Lead;
  onUpdate: (id: string, status: string) => void;
}): React.ReactElement {
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState({ top: 0, left: 0 });
  const btnRef              = useRef<HTMLButtonElement>(null);
  const cfg                 = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;

  const toggle = () => {
    if (!open && btnRef.current) {
      const r     = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setPos({
        top:  below < 380 ? r.top - 380 - 8 : r.bottom + 8,
        left: r.left,
      });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold
          border transition-all ring-1
          ${cfg.bg} ${cfg.color}
          ${open ? 'ring-[#029bba]' : 'ring-transparent hover:ring-gray-200'}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[999] w-52 bg-white rounded-2xl shadow-2xl border
              border-gray-100 py-2 overflow-y-auto max-h-[380px]"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider
              border-b border-gray-100 sticky top-0 bg-white">
              Change Status
            </p>
            {Object.entries(STATUS_CONFIG).map(([key, c]) => (
              <button key={key}
                onClick={() => { onUpdate(lead._id, key); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left
                  transition-colors hover:bg-gray-50
                  ${lead.status === key ? 'bg-[#029bba]/5 font-semibold text-[#029bba]' : 'text-gray-700'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                {c.label}
                {lead.status === key && <CheckCircle2 className="w-3.5 h-3.5 text-[#029bba] ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ── Priority Dropdown ──────────────────────────────────────────────────────────

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
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
          border transition-all
          ${cfg.bg} ${cfg.color}
          ${open ? 'ring-2 ring-[#029bba]' : ''}`}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: cfg.dot }} />
        {cfg.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[999] w-44 bg-white rounded-2xl shadow-2xl border
              border-gray-100 py-2"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider
              border-b border-gray-100">
              Change Priority
            </p>
            {(['urgent', 'high', 'medium', 'low'] as const).map(p => {
              const c = PRIORITY_CONFIG[p];
              return (
                <button key={p}
                  onClick={() => { onUpdate(lead._id, p); setOpen(false); }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left
                    transition-colors hover:bg-gray-50
                    ${lead.priority === p ? 'bg-[#029bba]/5 font-semibold text-[#029bba]' : 'text-gray-700'}`}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.dot }} />
                  {c.label}
                  {lead.priority === p && <CheckCircle2 className="w-3.5 h-3.5 text-[#029bba] ml-auto" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ── Assignment Dropdown ────────────────────────────────────────────────────────

function AssignmentDropdown({
  lead, teamMembers, onUpdate,
}: {
  lead:        Lead;
  teamMembers: Array<{ _id: string; name: string; email: string; role: string }>;
  onUpdate:    (id: string, assignedTo: string, assignedToRole: string) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef          = useRef<HTMLButtonElement>(null);
  const current         = teamMembers.find(m => m.email === lead.assignedTo);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r     = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setPos({
        top:  below < 300 ? r.top - 300 - 8 : r.bottom + 8,
        left: r.left,
      });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
          border transition-all
          ${current ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}
          ${open ? 'ring-2 ring-[#029bba]' : ''}`}>
        <User className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-w-[90px] truncate">{current?.name ?? 'Unassigned'}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[999] w-56 bg-white rounded-2xl shadow-2xl border
              border-gray-100 py-2 max-h-[300px] overflow-y-auto"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider
              border-b border-gray-100 sticky top-0 bg-white">
              Assign Lead To
            </p>
            {/* Unassign */}
            <button
              onClick={() => { onUpdate(lead._id, '', 'admin'); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left
                transition-colors hover:bg-gray-50
                ${!lead.assignedTo ? 'bg-[#029bba]/5 text-[#029bba] font-semibold' : 'text-gray-500'}`}>
              <User className="w-4 h-4 flex-shrink-0" />
              Unassigned
              {!lead.assignedTo && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#029bba]" />}
            </button>
            {/* Team members */}
            {teamMembers.map(m => (
              <button key={m._id}
                onClick={() => { onUpdate(lead._id, m.email, m.role); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left
                  transition-colors hover:bg-gray-50
                  ${lead.assignedTo === m.email ? 'bg-[#029bba]/5 font-semibold text-[#029bba]' : 'text-gray-700'}`}>
                <div className="w-7 h-7 rounded-full bg-[#029bba] text-white flex items-center
                  justify-center text-xs font-bold flex-shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{m.name}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{m.role}</p>
                </div>
                {lead.assignedTo === m.email && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                )}
              </button>
            ))}
            {teamMembers.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No team members</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Inline Notes Modal ─────────────────────────────────────────────────────────

function NotesModal({
  lead, onClose, onSave,
}: {
  lead:    Lead;
  onClose: () => void;
  onSave:  (leadId: string, notes: string) => Promise<void>;
}): React.ReactElement {
  const [notes,  setNotes]  = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(lead._id, notes);
      onClose();
    } catch {
      setError('Failed to save notes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100
          bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="font-bold text-gray-900">Admin Notes</h3>
            <p className="text-xs text-gray-500 mt-0.5">{lead.name} · {getEntityName(lead)}</p>
          </div>
          {!saving && (
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
              Notes
              <span className="ml-1.5 text-gray-400 font-normal normal-case">(admin only — not visible to lead)</span>
            </label>
            <textarea
              rows={6}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add internal notes, follow-up reminders, or sales observations..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                focus:border-[#029bba] resize-none transition-all"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/5000</p>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600
              border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
              bg-[#029bba] text-white rounded-xl hover:bg-[#027a94]
              transition-colors disabled:opacity-60 shadow-sm">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : null}
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({
  lead, isBulk, count, onClose, onConfirm, loading,
}: {
  lead?:     Lead | null;
  isBulk:    boolean;
  count?:    number;
  onClose:   () => void;
  onConfirm: () => void;
  loading:   boolean;
}): React.ReactElement {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10
        border border-gray-100 overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100
          bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center
              justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                {isBulk ? `Archive ${count} Leads?` : 'Archive Lead?'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          {!loading && (
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            {isBulk
              ? `Are you sure you want to archive ${count} selected leads? They will be marked as archived and hidden from active view.`
              : `Are you sure you want to archive the lead from "${lead?.name ?? ''}"?`}
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600
              border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
              bg-red-600 text-white rounded-xl hover:bg-red-700
              transition-colors disabled:opacity-60 shadow-sm">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Trash2 className="w-4 h-4" />}
            {loading ? 'Archiving...' : 'Yes, Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Email Compose Modal ────────────────────────────────────────────────────────

function EmailComposeModal({
  lead, onClose, onSent, showBanner,
}: {
  lead:       Lead;
  onClose:    () => void;
  onSent:     () => void;
  showBanner: (type: BannerState['type'], message: string) => void;
}): React.ReactElement {
  const [subject, setSubject] = useState(
    `Regarding your inquiry about ${getEntityName(lead)}`
  );
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showBanner('error', 'Subject and message are required.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${lead._id}/email`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        showBanner('success', 'Email sent successfully.');
        onSent();
        onClose();
      } else {
        showBanner('error', d.message ?? 'Failed to send email.');
      }
    } catch {
      showBanner('error', 'Network error — could not send email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={sending ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl z-10
        border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100
          bg-gradient-to-r from-[#029bba]/5 to-white">
          <div>
            <h3 className="font-bold text-gray-900">Compose Email</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              To: {lead.name} &lt;{lead.email}&gt;
            </p>
          </div>
          {!sending && (
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* To (readonly) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">To</label>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200
              rounded-xl text-sm text-gray-700">
              <Mail className="w-4 h-4 text-[#029bba] flex-shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Subject</label>
            <input type="text" value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                focus:border-[#029bba] transition-all"
              placeholder="Email subject"
            />
          </div>
          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Message</label>
            <textarea rows={6} value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                focus:border-[#029bba] resize-none transition-all"
              placeholder="Write your message here..."
            />
            <p className="text-[11px] text-gray-400 mt-1">
              This email will be sent from Highrise.pk and logged in the lead&apos;s timeline.
            </p>
          </div>
          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={sending}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600
                border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold
                bg-[#029bba] text-white rounded-xl hover:bg-[#027a94]
                transition-colors disabled:opacity-60 shadow-sm">
              {sending
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Email View Modal ───────────────────────────────────────────────────────────

function EmailViewModal({
  email, onClose,
}: {
  email:   EmailLog;
  onClose: () => void;
}): React.ReactElement {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10
        border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100
          bg-gray-50/50">
          <div>
            <h3 className="font-bold text-gray-900">Email Details</h3>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(email.sentAt ?? email.createdAt)}
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subject</p>
                <p className="font-semibold text-gray-900 mt-0.5">{email.subject}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase
                ${email.status === 'sent'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'}`}>
                {email.status}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sent To</p>
                <p className="text-sm text-gray-700 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {email.to}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sent By</p>
                <p className="text-sm text-gray-700 mt-0.5">{email.sentBy}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message</p>
            <div className="bg-white border border-gray-200 p-5 rounded-xl text-gray-800
              text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {email.message}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm
              font-semibold hover:bg-gray-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lead Detail Modal ──────────────────────────────────────────────────────────

function LeadDetailModal({
  lead, onClose, onSendEmailClick, showBanner,
}: {
  lead:             Lead;
  onClose:          () => void;
  onSendEmailClick: (lead: Lead) => void;
  showBanner:       (type: BannerState['type'], message: string) => void;
}): React.ReactElement {
  const [activeTab,     setActiveTab]     = useState<'overview' | 'emails'>('overview');
  const [emails,        setEmails]        = useState<EmailLog[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailError,    setEmailError]    = useState(false);
  const [viewEmail,     setViewEmail]     = useState<EmailLog | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'emails') return;
    setLoadingEmails(true);
    setEmailError(false);
    fetch(`/api/leads/${lead._id}/email`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setEmails(d.emails ?? []);
        else setEmailError(true);
      })
      .catch(() => setEmailError(true))
      .finally(() => setLoadingEmails(false));
  }, [activeTab, lead._id]);

  const entityName     = getEntityName(lead);
  const entityLocation = getEntityLocation(lead);
  const entityImage    = getEntityImage(lead);
  const tempCfg        = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl z-10
          border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100
            bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900">{lead.name}</h2>
                {isAleemLead(lead) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#029bba]/10
                    text-[#029bba] rounded-full text-[11px] font-bold border border-[#029bba]/20">
                    <Bot className="w-3 h-3" /> Aleem AI
                  </span>
                )}
                {tempCfg && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    text-[11px] font-bold border ${tempCfg.bg} ${tempCfg.text} ${tempCfg.border}`}>
                    <Thermometer className="w-3 h-3" /> {tempCfg.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">ID: {lead._id.slice(-8)}</p>
                <span className="text-gray-200">|</span>
                <p className="text-xs font-semibold text-[#029bba]">{entityName}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6 bg-white">
            {([
              { key: 'overview', label: 'Overview',      icon: User },
              { key: 'emails',   label: 'Email History', icon: Mail },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold
                  border-b-2 transition-colors
                  ${activeTab === t.key
                    ? 'border-[#029bba] text-[#029bba]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">

                {/* Score + Priority + Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Lead Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            lead.leadScore >= 80 ? 'bg-emerald-500' :
                            lead.leadScore >= 60 ? 'bg-orange-500' :
                            lead.leadScore >= 40 ? 'bg-amber-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${lead.leadScore}%` }}
                        />
                      </div>
                      <span className="text-xl font-black text-gray-900">{lead.leadScore}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Priority</p>
                    {(() => {
                      const c = PRIORITY_CONFIG[lead.priority] ?? PRIORITY_CONFIG.medium;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5
                          rounded-full text-sm font-bold ${c.bg} ${c.color}`}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
                          {c.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Status</p>
                    {(() => {
                      const c = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
                      const Icon = c.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5
                          rounded-full text-sm font-bold ${c.bg} ${c.color}`}>
                          <Icon className="w-4 h-4" />
                          {c.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#029bba]" /> Contact Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Email</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" /> {lead.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Phone</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" /> {lead.phone}
                      </p>
                    </div>
                    {lead.cnic && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">CNIC</p>
                        <p className="font-semibold text-gray-900">{lead.cnic}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Lead Type</p>
                      {(() => {
                        const lt  = LEAD_TYPE_CONFIG[lead.leadType];
                        const Icon = lt?.icon ?? MessageSquare;
                        return (
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-400" />
                            {lt?.label ?? lead.leadType}
                          </p>
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Entity Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{lead.entityType}</p>
                    </div>
                  </div>
                </div>

                {/* Entity Info — Project or Property (null-safe) */}
                {(lead.projectSnapshot ?? lead.propertySnapshot) && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#029bba]" />
                      {lead.projectSnapshot ? 'Project Details' : 'Property Details'}
                    </h4>
                    <div className="flex items-start gap-4">
                      {entityImage && (
                        <img src={entityImage} alt={entityName}
                          className="w-20 h-20 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-gray-900 text-base">{entityName}</h5>
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {entityLocation}
                        </p>
                        {/* Project price range */}
                        {lead.projectSnapshot?.minPrice && lead.projectSnapshot?.maxPrice && (
                          <p className="text-sm font-bold text-[#029bba] mt-1.5">
                            {formatPKR(lead.projectSnapshot.minPrice)} – {formatPKR(lead.projectSnapshot.maxPrice)}
                          </p>
                        )}
                        {/* Property price */}
                        {lead.propertySnapshot?.price && (
                          <p className="text-sm font-bold text-[#029bba] mt-1.5">
                            PKR {formatPrice(lead.propertySnapshot.price)}
                          </p>
                        )}
                        {/* Unit */}
                        {lead.unit && (
                          <p className="text-xs text-gray-500 mt-1">
                            Unit: {lead.unit.type} — {lead.unit.unitNumber}
                            {lead.unit.floorNumber && ` (Floor ${lead.unit.floorNumber})`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Developer Info (null-safe) */}
                {lead.developerSnapshot && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Developer</h4>
                    <div className="flex items-center gap-3">
                      {lead.developerSnapshot.logo ? (
                        <img src={lead.developerSnapshot.logo}
                          alt={lead.developerSnapshot.companyName}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center
                          justify-center border border-[#029bba]/20">
                          <Building2 className="w-6 h-6 text-[#029bba]" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{getDeveloperName(lead)}</p>
                        <p className="text-sm text-gray-500">{getDeveloperEmail(lead)}</p>
                        {lead.developerSnapshot.phone && (
                          <p className="text-sm text-gray-500">{lead.developerSnapshot.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Aleem AI lead info */}
                {isAleemLead(lead) && (
                  <div className="bg-[#029bba]/5 rounded-2xl border border-[#029bba]/20 p-5">
                    <h4 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#029bba]" /> Aleem AI Lead
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {lead.sessionId && (
                        <div>
                          <p className="text-xs text-gray-400">Session ID</p>
                          <p className="font-mono text-xs text-gray-700">{lead.sessionId.slice(-12)}</p>
                        </div>
                      )}
                      {lead.conversationId && (
                        <div>
                          <p className="text-xs text-gray-400">Conversation</p>
                          <a href={`/admin/aleem/conversations?id=${lead.conversationId}`}
                            className="text-xs font-semibold text-[#029bba] hover:underline">
                            View Chat →
                          </a>
                        </div>
                      )}
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

                {/* Budget */}
                {lead.budget && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#029bba]" /> Budget Info
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {lead.budget.min != null && (
                        <div>
                          <p className="text-xs text-gray-400">Min Budget</p>
                          <p className="font-semibold text-gray-900">PKR {formatPrice(lead.budget.min)}</p>
                        </div>
                      )}
                      {lead.budget.max != null && (
                        <div>
                          <p className="text-xs text-gray-400">Max Budget</p>
                          <p className="font-semibold text-gray-900">PKR {formatPrice(lead.budget.max)}</p>
                        </div>
                      )}
                      {lead.budget.tier && (
                        <div>
                          <p className="text-xs text-gray-400">Tier</p>
                          <p className="font-semibold text-gray-900">{lead.budget.tier}</p>
                        </div>
                      )}
                      {lead.budget.paymentPreference && (
                        <div>
                          <p className="text-xs text-gray-400">Payment</p>
                          <p className="font-semibold text-gray-900 capitalize">{lead.budget.paymentPreference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Source tracking */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Source & Tracking</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Source</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {lead.source.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {lead.utmSource && (
                      <div>
                        <p className="text-xs text-gray-400">UTM Source</p>
                        <p className="font-semibold text-gray-900">{lead.utmSource}</p>
                      </div>
                    )}
                    {lead.utmMedium && (
                      <div>
                        <p className="text-xs text-gray-400">UTM Medium</p>
                        <p className="font-semibold text-gray-900">{lead.utmMedium}</p>
                      </div>
                    )}
                    {lead.utmCampaign && (
                      <div>
                        <p className="text-xs text-gray-400">UTM Campaign</p>
                        <p className="font-semibold text-gray-900">{lead.utmCampaign}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Engagement */}
                {(lead.pageViewDuration || lead.downloadedBrochure ||
                  lead.viewedFloorPlan  || lead.watchedVideo) && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Engagement</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {lead.pageViewDuration && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          Viewed {Math.floor(lead.pageViewDuration / 60)}m {lead.pageViewDuration % 60}s
                        </div>
                      )}
                      {lead.downloadedBrochure && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Download className="w-4 h-4 text-emerald-500" /> Downloaded Brochure
                        </div>
                      )}
                      {lead.viewedFloorPlan && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Eye className="w-4 h-4 text-blue-500" /> Viewed Floor Plan
                        </div>
                      )}
                      {lead.watchedVideo && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Award className="w-4 h-4 text-violet-500" /> Watched Video
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {lead.timeline && lead.timeline.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Timeline</h4>
                    <div className="space-y-3">
                      {lead.timeline.map((entry, i) => (
                        <div key={i} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                          <div className="w-2 h-2 rounded-full bg-[#029bba] mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{entry.action}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              by {entry.performedBy} · {timeAgo(entry.timestamp)}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {lead.notes && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Admin Notes</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {lead.notes}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700
                          rounded-full text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Created</p>
                    <p className="font-semibold text-gray-900">{formatDateTime(lead.createdAt)}</p>
                  </div>
                  {lead.lastContactedAt && (
                    <div>
                      <p className="text-xs text-gray-400">Last Contacted</p>
                      <p className="font-semibold text-gray-900">{formatDateTime(lead.lastContactedAt)}</p>
                    </div>
                  )}
                  {lead.scheduledVisit && (
                    <div>
                      <p className="text-xs text-gray-400">Scheduled Visit</p>
                      <p className="font-semibold text-gray-900">{formatDateTime(lead.scheduledVisit)}</p>
                    </div>
                  )}
                  {lead.followUpDate && (
                    <div>
                      <p className="text-xs text-gray-400">Follow-up Date</p>
                      <p className="font-semibold text-gray-900">{formatDateTime(lead.followUpDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── EMAIL HISTORY ── */}
            {activeTab === 'emails' && (
              <div className="space-y-4">
                {loadingEmails ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#029bba] mb-3" />
                    <p className="text-sm text-gray-500">Loading emails...</p>
                  </div>
                ) : emailError ? (
                  <div className="text-center py-16">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-900">Failed to load emails</p>
                    <button onClick={() => setActiveTab('overview')}
                      className="text-xs text-[#029bba] hover:underline mt-2">
                      Go back to overview
                    </button>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-700">No emails sent yet</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Start a conversation with this lead</p>
                    <button onClick={() => onSendEmailClick(lead)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#029bba]
                        text-white text-sm font-semibold rounded-xl hover:bg-[#027a94] transition-colors">
                      <Mail className="w-4 h-4" /> Compose Email
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emails.map(email => (
                      <div key={email._id}
                        className="bg-white border border-gray-200 rounded-2xl p-4
                          hover:shadow-sm transition-shadow flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h5 className="font-bold text-gray-900 text-sm truncate">
                              {email.subject}
                            </h5>
                            <span className={`flex-shrink-0 text-[10px] font-bold uppercase
                              px-2 py-0.5 rounded-full
                              ${email.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'}`}>
                              {email.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2
                            bg-gray-50 p-2 rounded-xl border border-gray-100">
                            {email.message}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {email.sentBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(email.sentAt ?? email.createdAt)}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => setViewEmail(email)}
                          className="p-2 text-gray-400 hover:text-[#029bba]
                            hover:bg-[#029bba]/5 rounded-xl transition-colors flex-shrink-0"
                          title="View full email">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4
            border-t border-gray-100 bg-gray-50/50">
            <div className="flex gap-2">
              <a href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600
                  text-white rounded-xl text-sm font-bold hover:bg-emerald-700
                  transition-colors shadow-sm">
                <Phone className="w-4 h-4" /> Call Now
              </a>
              <button onClick={() => onSendEmailClick(lead)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#029bba]
                  text-white rounded-xl text-sm font-bold hover:bg-[#027a94]
                  transition-colors shadow-sm">
                <Mail className="w-4 h-4" /> Send Email
              </button>
            </div>
            <button onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-600
                rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Email view on top */}
      {viewEmail && (
        <EmailViewModal email={viewEmail} onClose={() => setViewEmail(null)} />
      )}
    </>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

function LeadsContent(): React.ReactElement {
  // ── State ──────────────────────────────────────────────────────
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [stats,       setStats]       = useState<Stats>({
    all: 0, new: 0, contacted: 0, qualified: 0,
    site_visit_scheduled: 0, proposal_sent: 0, negotiation: 0,
    won: 0, lost: 0, nurture: 0,
    priority: { low: 0, medium: 0, high: 0, urgent: 0 },
    avgScore: 0, conversionRate: 0, totalRevenue: 0,
  });
  const [pagination, setPagination]   = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });

  // Filters
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter,   setSourceFilter]   = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [debSearch,      setDebSearch]      = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Team
  const [teamMembers, setTeamMembers] = useState<Array<{
    _id: string; name: string; email: string; role: string;
  }>>([]);

  // Modals
  const [detailLead,  setDetailLead]  = useState<Lead | null>(null);
  const [emailLead,   setEmailLead]   = useState<Lead | null>(null);
  const [notesLead,   setNotesLead]   = useState<Lead | null>(null);
  const [deleteLead,  setDeleteLead]  = useState<Lead | null>(null);
  const [bulkDelete,  setBulkDelete]  = useState(false);
  const [actionBusy,  setActionBusy]  = useState(false);

  // Banner
  const [banner,      setBanner]      = useState<BannerState | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((type: BannerState['type'], message: string) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 5000);
  }, []);

  // ── Debounce search ──────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebSearch(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch team ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/users?role=admin,developer&limit=100', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setTeamMembers(d.users ?? []); })
      .catch(() => null);
  }, []);

  // ── Fetch leads ──────────────────────────────────────────────
  const fetchLeads = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        status:    statusFilter,
        priority:  priorityFilter,
        page:      String(pagination.page),
        limit:     String(pagination.limit),
        search:    debSearch,
        sortBy:    'createdAt',
        sortOrder: 'desc',
      });
      if (sourceFilter !== 'all') params.set('source', sourceFilter);

      const res  = await fetch(`/api/leads?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();

      if (res.ok && data.success) {
        setLeads(data.data ?? []);
        if (data.stats)      setStats(data.stats);
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total:      data.pagination.total,
            totalPages: data.pagination.totalPages,
          }));
        }
      } else {
        showBanner('error', data.message ?? 'Failed to load leads.');
      }
    } catch {
      showBanner('error', 'Network error — could not load leads.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, priorityFilter, pagination.page, pagination.limit, debSearch, sourceFilter, showBanner]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Selection ─────────────────────────────────────────────────
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === leads.length ? [] : leads.map(l => l._id));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // ── Status update ─────────────────────────────────────────────
  const handleStatusUpdate = async (id: string, status: string) => {
    const res  = await fetch(`/api/leads/${id}`, {
      method:      'PATCH',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ status }),
    });
    const d = await res.json();
    if (res.ok && d.success) {
      showBanner('success', `Status updated to ${STATUS_CONFIG[status]?.label ?? status}.`);
      await fetchLeads(true);
    } else {
      showBanner('error', d.message ?? 'Failed to update status.');
    }
  };

  // ── Priority update ───────────────────────────────────────────
  const handlePriorityUpdate = async (id: string, priority: string) => {
    const res  = await fetch(`/api/leads/${id}`, {
      method:      'PATCH',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ priority }),
    });
    const d = await res.json();
    if (res.ok && d.success) {
      showBanner('success', `Priority updated to ${PRIORITY_CONFIG[priority]?.label ?? priority}.`);
      await fetchLeads(true);
    } else {
      showBanner('error', d.message ?? 'Failed to update priority.');
    }
  };

  // ── Assignment update ─────────────────────────────────────────
  const handleAssignmentUpdate = async (
    id: string, assignedTo: string, assignedToRole: string
  ) => {
    const res  = await fetch(`/api/leads/${id}`, {
      method:      'PATCH',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({
        assignedTo:     assignedTo || null,
        assignedToRole: assignedToRole || 'admin',
      }),
    });
    const d = await res.json();
    if (res.ok && d.success) {
      const assignee = teamMembers.find(m => m.email === assignedTo);
      showBanner('success', assignedTo
        ? `Lead assigned to ${assignee?.name ?? assignedTo}.`
        : 'Lead unassigned.');
      await fetchLeads(true);
    } else {
      showBanner('error', d.message ?? 'Failed to update assignment.');
    }
  };

  // ── Save notes ────────────────────────────────────────────────
  const handleSaveNotes = async (leadId: string, notes: string) => {
    const res  = await fetch(`/api/leads/${leadId}`, {
      method:      'PATCH',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ notes }),
    });
    const d = await res.json();
    if (res.ok && d.success) {
      await fetchLeads(true);
    } else {
      throw new Error(d.message ?? 'Failed to save notes.');
    }
  };

  // ── Delete / Archive ──────────────────────────────────────────
  const handleDelete = async () => {
    setActionBusy(true);
    try {
      if (bulkDelete) {
        let ok = 0; let fail = 0;
        for (const id of selectedIds) {
          const r = await fetch(`/api/leads/${id}`, { method: 'DELETE', credentials: 'include' });
          const d = await r.json();
          if (r.ok && d.success) ok++; else fail++;
        }
        if (fail === 0)      showBanner('success', `${ok} lead(s) archived.`);
        else if (ok > 0)     showBanner('warning', `${ok} archived, ${fail} failed.`);
        else                 showBanner('error',   'Failed to archive selected leads.');
        setSelectedIds([]);
      } else if (deleteLead) {
        const res  = await fetch(`/api/leads/${deleteLead._id}`, {
          method: 'DELETE', credentials: 'include',
        });
        const d = await res.json();
        if (res.ok && d.success) showBanner('success', 'Lead archived successfully.');
        else showBanner('error', d.message ?? 'Failed to archive lead.');
      }
      setDeleteLead(null);
      setBulkDelete(false);
      await fetchLeads(true);
    } catch {
      showBanner('error', 'Network error — could not archive lead.');
    } finally {
      setActionBusy(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────
  const exportCSV = () => {
    if (leads.length === 0) { showBanner('warning', 'No leads to export.'); return; }
    const rows = [
      ['Name', 'Email', 'Phone', 'Entity', 'Location', 'Developer', 'Status', 'Priority', 'Temp', 'Score', 'Source', 'Date'],
      ...leads.map(l => [
        l.name, l.email, l.phone,
        getEntityName(l), getEntityLocation(l), getDeveloperName(l),
        l.status, l.priority, l.temperature ?? '',
        l.leadScore, l.source, formatDate(l.createdAt),
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `leads-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('success', 'CSV exported successfully!');
  };

  // ── Page change ───────────────────────────────────────────────
  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: p }));
      setSelectedIds([]);
    }
  };

  // ── Status tabs ───────────────────────────────────────────────
  const STATUS_TABS = [
    { key: 'all',                  label: 'All',       count: stats.all },
    { key: 'new',                  label: 'New',       count: stats.new },
    { key: 'contacted',            label: 'Contacted', count: stats.contacted },
    { key: 'qualified',            label: 'Qualified', count: stats.qualified },
    { key: 'site_visit_scheduled', label: 'Scheduled', count: stats.site_visit_scheduled },
    { key: 'won',                  label: 'Won',       count: stats.won },
    { key: 'lost',                 label: 'Lost',      count: stats.lost },
  ];

  const SOURCE_TABS = [
    { key: 'all',               label: 'All Sources', icon: '📊' },
    { key: 'direct',            label: 'Aleem AI',    icon: '🤖' },
    { key: 'property_page',     label: 'Property',    icon: '🏠' },
    { key: 'project_page',      label: 'Project',     icon: '🏗️' },
    { key: 'listing_page',      label: 'Society',     icon: '🏘️' },
    { key: 'developer_profile', label: 'Developer',   icon: '👤' },
    { key: 'agent_profile',     label: 'Agent',       icon: '🏢' },
    { key: 'referral',          label: 'Referral',    icon: '🔗' },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Modals */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onSendEmailClick={lead => { setDetailLead(null); setEmailLead(lead); }}
          showBanner={showBanner}
        />
      )}
      {emailLead && (
        <EmailComposeModal
          lead={emailLead}
          onClose={() => setEmailLead(null)}
          onSent={() => fetchLeads(true)}
          showBanner={showBanner}
        />
      )}
      {notesLead && (
        <NotesModal
          lead={notesLead}
          onClose={() => setNotesLead(null)}
          onSave={handleSaveNotes}
        />
      )}
      {(deleteLead || bulkDelete) && (
        <ConfirmDeleteModal
          lead={deleteLead}
          isBulk={bulkDelete}
          count={selectedIds.length}
          onClose={() => { setDeleteLead(null); setBulkDelete(false); }}
          onConfirm={handleDelete}
          loading={actionBusy}
        />
      )}

      {/* Banner */}
      {banner && <Banner banner={banner} onClose={() => setBanner(null)} />}

      <div className="p-6 space-y-6 pb-10">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063] tracking-tight">
              Lead Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track and manage all property inquiries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchLeads(true)} disabled={refreshing}
              className="p-2.5 text-gray-500 hover:text-[#029bba] hover:bg-gray-100
                rounded-xl transition-colors disabled:opacity-60"
              title="Refresh">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200
                text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total',       value: stats.all,               icon: Users,        bg: 'bg-[#029bba]/10', color: 'text-[#029bba]' },
            { label: 'New',         value: stats.new,               icon: Flame,        bg: 'bg-blue-100',     color: 'text-blue-600' },
            { label: 'Qualified',   value: stats.qualified,         icon: Target,       bg: 'bg-orange-100',   color: 'text-orange-600' },
            { label: 'Visits',      value: stats.site_visit_scheduled,icon: CalendarCheck,bg:'bg-indigo-100',  color: 'text-indigo-600' },
            { label: 'Won',         value: stats.won,               icon: CheckCircle2, bg: 'bg-emerald-100',  color: 'text-emerald-600' },
            { label: 'Conv. Rate',  value: `${stats.conversionRate}%`,icon: TrendingUp, bg: 'bg-violet-100',   color: 'text-violet-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4
                  flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                  flex-shrink-0 ${s.bg} ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Funnel ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#029bba]" /> Conversion Funnel
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'New Leads',       count: stats.new,                   color: 'bg-blue-500' },
              { label: 'Contacted',       count: stats.contacted,             color: 'bg-violet-500' },
              { label: 'Qualified',       count: stats.qualified,             color: 'bg-orange-500' },
              { label: 'Visits',          count: stats.site_visit_scheduled,  color: 'bg-indigo-500' },
              { label: 'Won',             count: stats.won,                   color: 'bg-emerald-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-28 text-xs font-medium text-gray-600 flex-shrink-0">{item.label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                  <div
                    className={`h-full ${item.color} flex items-center justify-end px-3
                      text-white text-xs font-bold transition-all duration-700`}
                    style={{
                      width: stats.new > 0 ? `${Math.max((item.count / stats.new) * 100, item.count > 0 ? 8 : 0)}%` : '0%',
                    }}>
                    {item.count > 0 && item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">

          {/* Source tabs */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2
              flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter by Source
            </p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_TABS.map(src => (
                <button key={src.key}
                  onClick={() => { setSourceFilter(src.key); setPagination(p => ({ ...p, page: 1 })); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs
                    font-semibold transition-all
                    ${sourceFilter === src.key
                      ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <span>{src.icon}</span>
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Status tabs + search row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Status tabs */}
            <div className="flex flex-wrap gap-2 flex-1">
              {STATUS_TABS.map(tab => (
                <button key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setPagination(p => ({ ...p, page: 1 })); setSelectedIds([]); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                    font-semibold transition-all
                    ${statusFilter === tab.key
                      ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-lg text-[11px] font-bold
                    ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text"
                placeholder="Name, email, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#029bba]/20
                  focus:border-[#029bba] transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-3 flex-wrap border-t border-gray-100 pt-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider
              flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Priority:
            </span>
            {(['all', 'urgent', 'high', 'medium', 'low'] as const).map(p => (
              <button key={p}
                onClick={() => { setPriorityFilter(p); setPagination(prev => ({ ...prev, page: 1 })); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${priorityFilter === p
                    ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                {p !== 'all' && (
                  <span className="ml-1 opacity-70">
                    ({stats.priority[p] ?? 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap border-t border-gray-100 pt-4">
              <span className="text-sm font-semibold text-gray-700">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => setBulkDelete(true)}
                disabled={actionBusy}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600
                  border border-red-200 rounded-xl text-sm font-semibold
                  hover:bg-red-100 transition-colors disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Archive Selected
              </button>
              <button onClick={() => setSelectedIds([])}
                className="px-4 py-2 text-sm font-semibold text-gray-600
                  hover:bg-gray-100 rounded-xl transition-colors ml-auto">
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent
                rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500 font-medium">Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center
                justify-center mx-auto mb-4 border border-gray-100">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-1">No leads found</h3>
              <p className="text-sm text-gray-400">
                {searchQuery
                  ? 'Try a different search term'
                  : 'When customers submit inquiries, they will appear here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3.5 text-left w-10">
                        <input type="checkbox"
                          checked={selectedIds.length === leads.length && leads.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                        />
                      </th>
                      {['Customer', 'Inquiry', 'Status', 'Score', 'Priority', 'Assigned', 'Date', 'Actions'].map((h, i) => (
                        <th key={h}
                          className={`px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider
                            ${i === 7 ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map(lead => {
                      const entityName = getEntityName(lead);
                      const entityLoc  = getEntityLocation(lead);
                      const tempCfg    = lead.temperature ? TEMP_CONFIG[lead.temperature] : null;
                      const isAleem    = isAleemLead(lead);

                      return (
                        <tr key={lead._id}
                          className={`hover:bg-gray-50/80 transition-colors
                            ${selectedIds.includes(lead._id) ? 'bg-[#029bba]/5' : ''}`}>

                          {/* Checkbox */}
                          <td className="px-4 py-3.5">
                            <input type="checkbox"
                              checked={selectedIds.includes(lead._id)}
                              onChange={() => toggleSelect(lead._id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                            />
                          </td>

                          {/* Customer */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br
                                from-[#029bba] to-[#004063] flex items-center justify-center
                                text-white font-bold text-sm flex-shrink-0">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-gray-900 text-sm truncate max-w-[140px]">
                                    {lead.name}
                                  </p>
                                  {isAleem && (
                                    <Bot className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[160px]">
                                  <Mail className="w-3 h-3 flex-shrink-0" /> {lead.email}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 flex-shrink-0" /> {lead.phone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Inquiry / Entity */}
                          <td className="px-4 py-3.5">
                            <div className="max-w-[200px]">
                              <p className="font-semibold text-gray-900 text-sm truncate"
                                title={entityName}>
                                {entityName}
                              </p>
                              {entityLoc !== '—' && (
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 flex-shrink-0" /> {entityLoc}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                {getDeveloperName(lead)}
                              </p>
                              {tempCfg && (
                                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5
                                  rounded-full text-[10px] font-bold border
                                  ${tempCfg.bg} ${tempCfg.text} ${tempCfg.border}`}>
                                  <Thermometer className="w-2.5 h-2.5" /> {tempCfg.label}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <StatusDropdown lead={lead} onUpdate={handleStatusUpdate} />
                          </td>

                          {/* Score */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-14 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    lead.leadScore >= 80 ? 'bg-emerald-500' :
                                    lead.leadScore >= 60 ? 'bg-orange-500' :
                                    lead.leadScore >= 40 ? 'bg-amber-500' : 'bg-gray-400'
                                  }`}
                                  style={{ width: `${lead.leadScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-gray-700 w-7">
                                {lead.leadScore}
                              </span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3.5">
                            <PriorityDropdown lead={lead} onUpdate={handlePriorityUpdate} />
                          </td>

                          {/* Assignment */}
                          <td className="px-4 py-3.5">
                            <AssignmentDropdown
                              lead={lead}
                              teamMembers={teamMembers}
                              onUpdate={handleAssignmentUpdate}
                            />
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {timeAgo(lead.createdAt)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setDetailLead(lead)}
                                className="p-2 text-gray-400 hover:text-[#029bba]
                                  hover:bg-[#029bba]/5 rounded-xl transition-colors"
                                title="View Details">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => setNotesLead(lead)}
                                className="p-2 text-gray-400 hover:text-amber-600
                                  hover:bg-amber-50 rounded-xl transition-colors"
                                title="Add Notes">
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteLead(lead)}
                                className="p-2 text-gray-400 hover:text-red-600
                                  hover:bg-red-50 rounded-xl transition-colors"
                                title="Archive Lead">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4
                  border-t border-gray-100 bg-gray-50/50">
                  <p className="text-sm text-gray-500">
                    Showing{' '}
                    <span className="font-bold text-gray-700">
                      {((pagination.page - 1) * pagination.limit) + 1}
                    </span>{' '}–{' '}
                    <span className="font-bold text-gray-700">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-bold text-gray-700">
                      {pagination.total.toLocaleString()}
                    </span>{' '}leads
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
                        rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        let p = i + 1;
                        if (pagination.totalPages > 5) {
                          if (pagination.page <= 3)                               p = i + 1;
                          else if (pagination.page >= pagination.totalPages - 2)  p = pagination.totalPages - 4 + i;
                          else                                                     p = pagination.page - 2 + i;
                        }
                        return (
                          <button key={p} onClick={() => handlePageChange(p)}
                            className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors
                              ${pagination.page === p
                                ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/20'
                                : 'text-gray-600 hover:bg-gray-100'}`}>
                            {p}
                          </button>
                        );
                      }
                    )}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100
                        rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── DEFAULT EXPORT ─────────────────────────────────────────────────────────────

export default function AdminLeadsPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      void router.replace('/login?redirect=/admin/leads');
    }
  }, [session, authStatus, router]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent
            rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') return <></>;

  return (
    <>
      <Head>
        <title>Lead Management | Admin — Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <AdminLayout>
        <LeadsContent />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========