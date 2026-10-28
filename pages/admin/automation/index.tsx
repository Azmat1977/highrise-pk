// pages/admin/automation/index.tsx
// ═══════════════════════════════════════════════════════════════
// AUTOMATION DASHBOARD — HIGHRISE.PK
// List all sequences with stats, status controls, quick actions
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Plus,
  Zap,
  Play,
  Pause,
  Archive,
  Edit,
  Users,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  BarChart2,
  ChevronRight,
  Inbox,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived';

interface SequenceStats {
  totalEnrolled:  number;
  activeCount:    number;
  completedCount: number;
  cancelledCount: number;
  failedCount:    number;
  emailsSent:     number;
}

interface Sequence {
  _id:           string;
  name:          string;
  description:   string;
  status:        SequenceStatus;
  trigger:       string;
  recipientType: string;
  steps:         { stepNumber: number; subject: string; delayDays: number }[];
  stats:         SequenceStats;
  createdAt:     string;
  updatedAt:     string;
}

interface DashboardStats {
  total:                 number;
  draft:                 number;
  active:                number;
  paused:                number;
  archived:              number;
  totalActiveEnrollments: number;
}

interface Banner {
  type:    'success' | 'error' | 'info';
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function triggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    subscriber_joined:    'New Subscriber',
    lead_created:         'New Lead',
    lead_status_changed:  'Lead Status Changed',
    manual:               'Manual Only',
  };
  return labels[trigger] || trigger;
}

function triggerColor(trigger: string): string {
  const colors: Record<string, string> = {
    subscriber_joined:   'bg-blue-100 text-blue-700',
    lead_created:        'bg-amber-100 text-amber-700',
    lead_status_changed: 'bg-purple-100 text-purple-700',
    manual:              'bg-gray-100 text-gray-600',
  };
  return colors[trigger] || 'bg-gray-100 text-gray-600';
}

function statusConfig(status: SequenceStatus): {
  label: string;
  bg:    string;
  text:  string;
  Icon:  React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case 'active':
      return { label: 'Active',   bg: 'bg-emerald-100', text: 'text-emerald-700', Icon: Play      };
    case 'paused':
      return { label: 'Paused',   bg: 'bg-amber-100',   text: 'text-amber-700',   Icon: Pause     };
    case 'draft':
      return { label: 'Draft',    bg: 'bg-gray-100',    text: 'text-gray-600',    Icon: Clock     };
    case 'archived':
      return { label: 'Archived', bg: 'bg-red-100',     text: 'text-red-600',     Icon: Archive   };
    default:
      return { label: status,     bg: 'bg-gray-100',    text: 'text-gray-600',    Icon: Clock     };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

// ─── Confirm Modal ────────────────────────────────────────────

const ConfirmModal: React.FC<{
  isOpen:      boolean;
  title:       string;
  message:     string;
  confirmText: string;
  variant:     'danger' | 'warning' | 'info';
  isLoading:   boolean;
  onConfirm:   () => void;
  onClose:     () => void;
}> = ({ isOpen, title, message, confirmText, variant, isLoading, onConfirm, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else        document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantBg = {
    danger:  'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info:    'bg-[#029bba] hover:bg-[#027a94]',
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-black text-[#004063] mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300
                       text-gray-700 font-semibold hover:bg-gray-50
                       transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold
                        transition-colors disabled:opacity-50 flex items-center
                        justify-center gap-2 ${variantBg}`}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : confirmText
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sequence Card ────────────────────────────────────────────

const SequenceCard: React.FC<{
  sequence:         Sequence;
  actionLoading:    string | null;
  onStatusChange:   (id: string, newStatus: string) => void;
  onArchive:        (seq: Sequence) => void;
}> = ({ sequence, actionLoading, onStatusChange, onArchive }) => {
  const cfg       = statusConfig(sequence.status);
  const StatusIcon = cfg.Icon;
  const isLoading  = actionLoading === sequence._id;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5
                    hover:shadow-md transition-shadow">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-black text-[#004063] truncate">
              {sequence.name}
            </h3>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 
                              rounded-full text-xs font-bold
                              ${cfg.bg} ${cfg.text}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
            {/* Trigger badge */}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                              ${triggerColor(sequence.trigger)}`}>
              {triggerLabel(sequence.trigger)}
            </span>
          </div>
          {sequence.description && (
            <p className="text-sm text-gray-500 line-clamp-1">
              {sequence.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Edit */}
          {sequence.status !== 'archived' && (
            <Link
              href={`/admin/automation/${sequence._id}/edit`}
              className="p-2 text-gray-400 hover:text-[#029bba]
                         hover:bg-[#029bba]/10 rounded-lg transition-all"
              title="Edit sequence"
            >
              <Edit className="w-4 h-4" />
            </Link>
          )}

          {/* Pause / Resume */}
          {sequence.status === 'active' && (
            <button
              type="button"
              onClick={() => onStatusChange(sequence._id, 'paused')}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-amber-600
                         hover:bg-amber-50 rounded-lg transition-all
                         disabled:opacity-50"
              title="Pause sequence"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Pause className="w-4 h-4" />
              }
            </button>
          )}

          {sequence.status === 'paused' && (
            <button
              type="button"
              onClick={() => onStatusChange(sequence._id, 'active')}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-emerald-600
                         hover:bg-emerald-50 rounded-lg transition-all
                         disabled:opacity-50"
              title="Resume sequence"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4" />
              }
            </button>
          )}

          {sequence.status === 'draft' && (
            <button
              type="button"
              onClick={() => onStatusChange(sequence._id, 'active')}
              disabled={isLoading || sequence.steps.length === 0}
              className="p-2 text-gray-400 hover:text-emerald-600
                         hover:bg-emerald-50 rounded-lg transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                sequence.steps.length === 0
                  ? 'Add steps before activating'
                  : 'Activate sequence'
              }
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4" />
              }
            </button>
          )}

          {/* Archive */}
          {sequence.status !== 'archived' && (
            <button
              type="button"
              onClick={() => onArchive(sequence)}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-red-500
                         hover:bg-red-50 rounded-lg transition-all
                         disabled:opacity-50"
              title="Archive sequence"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Steps summary ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {sequence.steps.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No steps yet — edit to add steps</p>
        ) : (
          sequence.steps.slice(0, 5).map((step, idx) => (
            <React.Fragment key={step.stepNumber}>
              <div className="flex-shrink-0 bg-gray-50 border border-gray-200
                              rounded-xl px-3 py-1.5 text-center min-w-max">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Step {step.stepNumber}
                </p>
                <p className="text-xs font-bold text-gray-700 max-w-[100px] truncate">
                  {step.subject || 'No subject'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {step.delayDays === 0 ? 'Immediate' : `Day ${step.delayDays}`}
                </p>
              </div>
              {idx < sequence.steps.slice(0, 5).length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))
        )}
        {sequence.steps.length > 5 && (
          <span className="text-xs text-gray-400 flex-shrink-0">
            +{sequence.steps.length - 5} more
          </span>
        )}
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
        {[
          {
            label:  'Enrolled',
            value:  sequence.stats.totalEnrolled,
            Icon:   Users,
            color:  'text-[#029bba]',
          },
          {
            label:  'Active',
            value:  sequence.stats.activeCount,
            Icon:   Zap,
            color:  'text-amber-500',
          },
          {
            label:  'Completed',
            value:  sequence.stats.completedCount,
            Icon:   CheckCircle,
            color:  'text-emerald-500',
          },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <stat.Icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className={`text-base font-black ${stat.color}`}>
                {stat.value.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {sequence.stats.emailsSent.toLocaleString()} sent
          </span>
          <span>·</span>
          <span>{sequence.steps.length} step{sequence.steps.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{formatDate(sequence.createdAt)}</span>
        </div>
        <Link
          href={`/admin/automation/${sequence._id}/edit`}
          className="text-xs font-semibold text-[#029bba] hover:underline
                     flex items-center gap-1"
        >
          View Details
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────

export default function AutomationIndexPage() {
  const router  = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [sequences,     setSequences]     = useState<Sequence[]>([]);
  const [stats,         setStats]         = useState<DashboardStats>({
    total: 0, draft: 0, active: 0, paused: 0,
    archived: 0, totalActiveEnrollments: 0,
  });
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banner,        setBanner]        = useState<Banner | null>(null);
  const [isProcessing,  setIsProcessing]  = useState(false);

  // Archive confirm modal
  const [archiveModal, setArchiveModal] = useState<{
    open: boolean;
    sequence: Sequence | null;
  }>({ open: false, sequence: null });

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.replace(`/login?redirect=${encodeURIComponent('/admin/automation')}`);
      return;
    }
    if ((session.user as any)?.role !== 'admin') {
      router.replace('/');
    }
  }, [session, sessionStatus, router]);

  // ── Banner auto-dismiss ───────────────────────────────────
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  // ── Fetch sequences ───────────────────────────────────────
  const fetchSequences = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/automation/sequences'
        : `/api/automation/sequences?status=${filter}`;

      const res  = await fetch(url, { credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        setSequences(data.sequences || []);
        setStats(data.stats || {
          total: 0, draft: 0, active: 0,
          paused: 0, archived: 0, totalActiveEnrollments: 0,
        });
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to load sequences' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') fetchSequences();
  }, [filter, sessionStatus, fetchSequences]);

  // ── Status change ─────────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const res  = await fetch(`/api/automation/sequences/${id}`, {
        method:      'PUT',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        setBanner({
          type:    'success',
          message: `Sequence ${newStatus === 'active' ? 'activated' : newStatus} successfully`,
        });
        fetchSequences();
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to update status' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Archive ───────────────────────────────────────────────
  const handleArchiveConfirm = async () => {
    if (!archiveModal.sequence) return;
    setActionLoading(archiveModal.sequence._id);

    try {
      const res  = await fetch(
        `/api/automation/sequences/${archiveModal.sequence._id}`,
        { method: 'DELETE', credentials: 'include' }
      );
      const data = await res.json();

      if (data.success) {
        setBanner({ type: 'success', message: data.message || 'Sequence archived' });
        setArchiveModal({ open: false, sequence: null });
        fetchSequences();
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to archive' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Manual process trigger ────────────────────────────────
  const handleManualProcess = async () => {
    setIsProcessing(true);
    try {
      const res  = await fetch('/api/automation/process', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        setBanner({
          type:    'success',
          message: `Processor ran: ${data.stats.sent} sent, ${data.stats.completed} completed`,
        });
        fetchSequences();
      } else {
        setBanner({ type: 'error', message: data.message || 'Processor failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────
  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
      </div>
    );
  }

  const filterTabs = [
    { id: 'all',      label: 'All',      count: stats.total    },
    { id: 'active',   label: 'Active',   count: stats.active   },
    { id: 'draft',    label: 'Drafts',   count: stats.draft    },
    { id: 'paused',   label: 'Paused',   count: stats.paused   },
    { id: 'archived', label: 'Archived', count: stats.archived  },
  ];

  return (
    <>
      <Head>
        <title>Automation · Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-6xl">

            {/* ── Header ──────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center
                            md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-[#004063]
                               flex items-center gap-2">
                  <Zap className="w-6 h-6 text-[#029bba]" />
                  Automation Sequences
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Set up drip campaigns that send automatically on triggers
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Manual process trigger */}
                <button
                  type="button"
                  onClick={handleManualProcess}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                             border border-gray-200 bg-white text-gray-600
                             font-semibold text-sm hover:bg-gray-50
                             transition-colors disabled:opacity-50"
                  title="Manually run the automation processor"
                >
                  {isProcessing
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />
                  }
                  Run Processor
                </button>

                <Link
                  href="/admin/automation/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5
                             rounded-xl bg-gradient-to-r from-[#029bba]
                             to-[#004063] text-white font-black text-sm
                             hover:shadow-lg hover:shadow-[#029bba]/20
                             transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Sequence
                </Link>
              </div>
            </div>

            {/* ── Stats cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: 'Active Sequences',
                  value: stats.active,
                  Icon:  Play,
                  color: 'text-emerald-600',
                  bg:    'bg-emerald-50',
                },
                {
                  label: 'Live Enrollments',
                  value: stats.totalActiveEnrollments,
                  Icon:  Users,
                  color: 'text-[#029bba]',
                  bg:    'bg-[#029bba]/10',
                },
                {
                  label: 'Paused',
                  value: stats.paused,
                  Icon:  Pause,
                  color: 'text-amber-600',
                  bg:    'bg-amber-50',
                },
                {
                  label: 'Total Sequences',
                  value: stats.total,
                  Icon:  BarChart2,
                  color: 'text-gray-600',
                  bg:    'bg-gray-100',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg}
                                    flex items-center justify-center flex-shrink-0`}>
                      <s.Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-black ${s.color}`}>
                        {s.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 font-semibold">
                        {s.label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filter tabs ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-3 mb-6">
              <div className="flex flex-wrap gap-1.5">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`
                      px-3 py-2 rounded-xl text-xs font-bold transition-all
                      flex items-center gap-2
                      ${filter === tab.id
                        ? 'bg-[#029bba] text-white shadow shadow-[#029bba]/20'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black
                      ${filter === tab.id
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-300 text-gray-700'
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Sequence list ─────────────────────────────────── */}
            {loading ? (
              <div className="flex items-center justify-center py-20
                              bg-white rounded-2xl border border-gray-200">
                <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
              </div>

            ) : sequences.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200
                              p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl
                                bg-gradient-to-br from-[#029bba]/10
                                to-[#004063]/10 flex items-center justify-center">
                  <Inbox className="w-8 h-8 text-[#029bba]" />
                </div>
                <h3 className="text-base font-black text-[#004063] mb-2">
                  {filter === 'all'
                    ? 'No automation sequences yet'
                    : `No ${filter} sequences`
                  }
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  {filter === 'all'
                    ? 'Create your first drip campaign to automatically nurture subscribers and leads.'
                    : 'Try a different filter to find your sequences.'
                  }
                </p>
                {filter === 'all' && (
                  <Link
                    href="/admin/automation/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5
                               rounded-xl bg-gradient-to-r from-[#029bba]
                               to-[#004063] text-white font-black text-sm
                               hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Sequence
                  </Link>
                )}
              </div>

            ) : (
              <div className="space-y-4">
                {sequences.map((sequence) => (
                  <SequenceCard
                    key={sequence._id}
                    sequence={sequence}
                    actionLoading={actionLoading}
                    onStatusChange={handleStatusChange}
                    onArchive={(seq) => setArchiveModal({ open: true, sequence: seq })}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </AdminLayout>

      {/* ── Banner ─────────────────────────────────────────────── */}
      {banner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50
                        max-w-md w-full mx-4">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-start gap-3
            ${banner.type === 'success' ? 'bg-emerald-500 text-white'
            : banner.type === 'error'   ? 'bg-red-500 text-white'
            :                             'bg-[#029bba] text-white'}`}>
            <p className="flex-1 text-sm font-bold">{banner.message}</p>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-white/80 hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Archive confirm modal ─────────────────────────────── */}
      <ConfirmModal
        isOpen={archiveModal.open}
        title="Archive Sequence?"
        message={
          `"${archiveModal.sequence?.name}" will be archived.\n\n` +
          `Active enrollments will be cancelled. This cannot be undone.`
        }
        confirmText="Archive"
        variant="danger"
        isLoading={actionLoading === archiveModal.sequence?._id}
        onConfirm={handleArchiveConfirm}
        onClose={() => setArchiveModal({ open: false, sequence: null })}
      />
    </>
  );
}