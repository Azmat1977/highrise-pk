// pages/admin/automation/[id]/edit.tsx
// ═══════════════════════════════════════════════════════════════
// EDIT AUTOMATION SEQUENCE — HIGHRISE.PK
// Loads existing sequence → renders SequenceBuilder in edit mode
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Loader2,
  X,
  ArrowLeft,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SequenceBuilder, {
  SequenceFormData,
} from '@/components/admin/automation/SequenceBuilder';

// ─── Types ────────────────────────────────────────────────────

interface Banner {
  type:    'success' | 'error' | 'info';
  message: string;
}

interface EnrollmentStats {
  active:    number;
  completed: number;
  cancelled: number;
  failed:    number;
  total:     number;
}

interface RecentEnrollment {
  email:         string;
  name:          string;
  status:        string;
  currentStep:   number;
  enrolledAt:    string;
  nextSendAt:    string | null;
  recipientType: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function enrollmentStatusStyle(status: string): string {
  switch (status) {
    case 'active':    return 'bg-emerald-100 text-emerald-700';
    case 'completed': return 'bg-blue-100 text-blue-700';
    case 'cancelled': return 'bg-gray-100 text-gray-600';
    case 'failed':    return 'bg-red-100 text-red-600';
    default:          return 'bg-gray-100 text-gray-600';
  }
}

// ─── Enrollment Stats Panel ───────────────────────────────────

const EnrollmentStatsPanel: React.FC<{
  stats:             EnrollmentStats;
  recentEnrollments: RecentEnrollment[];
}> = ({ stats, recentEnrollments }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <h3 className="text-sm font-black text-[#004063] mb-4 flex items-center gap-2">
      <Users className="w-4 h-4 text-[#029bba]" />
      Enrollment Activity
    </h3>

    {/* Stats grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[
        {
          label: 'Active',
          value: stats.active,
          Icon:  Clock,
          color: 'text-amber-600',
          bg:    'bg-amber-50',
        },
        {
          label: 'Completed',
          value: stats.completed,
          Icon:  CheckCircle,
          color: 'text-emerald-600',
          bg:    'bg-emerald-50',
        },
        {
          label: 'Cancelled',
          value: stats.cancelled,
          Icon:  XCircle,
          color: 'text-gray-500',
          bg:    'bg-gray-100',
        },
        {
          label: 'Failed',
          value: stats.failed,
          Icon:  AlertCircle,
          color: 'text-red-500',
          bg:    'bg-red-50',
        },
      ].map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 p-3 rounded-xl border border-gray-100"
        >
          <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center
                          justify-center flex-shrink-0`}>
            <s.Icon className={`w-4 h-4 ${s.color}`} />
          </div>
          <div>
            <p className={`text-lg font-black ${s.color}`}>
              {s.value.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase
                          tracking-wider">
              {s.label}
            </p>
          </div>
        </div>
      ))}
    </div>

    {/* Recent enrollments table */}
    {recentEnrollments.length === 0 ? (
      <div className="text-center py-6 text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No enrollments yet</p>
        <p className="text-xs mt-1">
          Recipients will appear here when the sequence is active
        </p>
      </div>
    ) : (
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Recent Enrollments
        </p>
        <div className="space-y-2">
          {recentEnrollments.map((enrollment, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl
                         hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br
                              from-[#029bba] to-[#004063] flex items-center
                              justify-center text-white text-xs font-black
                              flex-shrink-0">
                {(enrollment.name || enrollment.email).charAt(0).toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {enrollment.name || enrollment.email}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {enrollment.name ? enrollment.email : ''}
                </p>
              </div>

              {/* Step + status */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  Step {enrollment.currentStep}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full
                                  font-bold ${enrollmentStatusStyle(enrollment.status)}`}>
                  {enrollment.status}
                </span>
              </div>

              {/* Next send */}
              <div className="text-right flex-shrink-0 hidden md:block">
                <p className="text-[10px] text-gray-400">
                  {enrollment.status === 'active' && enrollment.nextSendAt
                    ? `Next: ${formatDate(enrollment.nextSendAt)}`
                    : formatDate(enrollment.enrolledAt)
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────

export default function EditAutomationPage() {
  const router  = useRouter();
  const { id }  = router.query;
  const { data: session, status: sessionStatus } = useSession();

  const [initialData,        setInitialData]        = useState<Partial<SequenceFormData> | null>(null);
  const [sequenceName,       setSequenceName]        = useState('');
  const [enrollmentStats,    setEnrollmentStats]     = useState<EnrollmentStats | null>(null);
  const [recentEnrollments,  setRecentEnrollments]   = useState<RecentEnrollment[]>([]);
  const [pageLoading,        setPageLoading]         = useState(true);
  const [pageError,          setPageError]           = useState('');
  const [isSaving,           setIsSaving]            = useState(false);
  const [banner,             setBanner]              = useState<Banner | null>(null);

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.replace(
        `/login?redirect=${encodeURIComponent(router.asPath)}`
      );
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

  // ── Load sequence data ────────────────────────────────────
  const loadSequence = useCallback(async () => {
    if (!id || typeof id !== 'string') return;

    setPageLoading(true);
    setPageError('');

    try {
      const res  = await fetch(`/api/automation/sequences/${id}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPageError(data.message || 'Failed to load sequence');
        return;
      }

      const seq = data.sequence;
      setSequenceName(seq.name || 'Sequence');

      // Map API shape → SequenceFormData shape
      const formData: Partial<SequenceFormData> = {
        name:            seq.name         || '',
        description:     seq.description  || '',
        trigger:         seq.trigger      || '',
        status:          seq.status       || 'draft',
        steps:           (seq.steps || []).map((s: any) => ({
          stepNumber:  s.stepNumber  || 1,
          delayDays:   s.delayDays   || 0,
          subject:     s.subject     || '',
          previewText: s.previewText || '',
          content:     s.content     || '',
          fromName:    s.fromName    || '',
          fromEmail:   s.fromEmail   || '',
        })),
        filters: {
          subscriberSource: seq.triggerFilters?.subscriberSources || [],
          leadCities:       seq.triggerFilters?.leadCities        || [],
          leadTypes:        seq.triggerFilters?.leadTypes         || [],
          leadStatuses:     seq.triggerFilters?.leadStatuses      || [],
          leadPriorities:   [],
          entityTypes:      [],
        },
        defaultFromName:  seq.defaultFromName  || 'Highrise.pk',
        defaultFromEmail: seq.defaultFromEmail || '',
      };

      setInitialData(formData);
      setEnrollmentStats(data.enrollmentStats || null);
      setRecentEnrollments(data.recentEnrollments || []);

    } catch {
      setPageError('Network error — please try again');
    } finally {
      setPageLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && id) {
      loadSequence();
    }
  }, [id, sessionStatus, loadSequence]);

  // ── Save handler ──────────────────────────────────────────
  const handleSave = async (data: SequenceFormData): Promise<void> => {
    if (!id || typeof id !== 'string') return;

    setIsSaving(true);
    try {
      const triggerFilters = {
        subscriberSources: data.filters.subscriberSource,
        leadCities:        data.filters.leadCities,
        leadTypes:         data.filters.leadTypes,
        leadStatuses:      data.filters.leadStatuses,
        leadSources:       [],
      };

      const res = await fetch(`/api/automation/sequences/${id}`, {
        method:      'PUT',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             data.name,
          description:      data.description,
          status:           data.status,
          steps:            data.steps,
          triggerFilters,
          defaultFromName:  data.defaultFromName,
          defaultFromEmail: data.defaultFromEmail,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setBanner({
          type:    'success',
          message: 'Sequence saved successfully',
        });
        // Refresh enrollment stats
        loadSequence();
      } else {
        setBanner({
          type:    'error',
          message: result.message || 'Failed to save sequence',
        });
        throw new Error(result.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setBanner({ type: 'error', message: msg });
      throw err;
    } finally {
      setIsSaving(false);
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

  // ── Page error state ──────────────────────────────────────
  if (pageError) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center
                            justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-[#004063] mb-2">
              Could not load sequence
            </h2>
            <p className="text-gray-500 text-sm mb-4">{pageError}</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={loadSequence}
                className="px-4 py-2 bg-[#029bba] text-white rounded-xl
                           text-sm font-bold hover:bg-[#027a94] transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/admin/automation"
                className="px-4 py-2 border border-gray-300 text-gray-700
                           rounded-xl text-sm font-semibold hover:bg-gray-50
                           transition-colors"
              >
                Back to Automation
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Page loading state ────────────────────────────────────
  if (pageLoading || !initialData) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#029bba]
                                mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">
              Loading sequence...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{sequenceName} — Edit · Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-3xl">

            {/* ── Page header ─────────────────────────────── */}
            <div className="flex items-center gap-3 mb-6">
              <Link
                href="/admin/automation"
                className="p-2 hover:bg-white rounded-xl border border-transparent
                           hover:border-gray-200 transition-all text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-[#004063]">
                  Edit Sequence
                </h1>
                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-md">
                  {sequenceName}
                </p>
              </div>
            </div>

            {/* ── Enrollment stats panel ───────────────────── */}
            {enrollmentStats && (
              <div className="mb-6">
                <EnrollmentStatsPanel
                  stats={enrollmentStats}
                  recentEnrollments={recentEnrollments}
                />
              </div>
            )}

            {/* ── Sequence builder ─────────────────────────── */}
            <SequenceBuilder
              mode="edit"
              initialData={initialData}
              onSave={handleSave}
              isSaving={isSaving}
            />

          </div>
        </div>
      </AdminLayout>

      {/* ── Banner ───────────────────────────────────────────── */}
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
    </>
  );
}