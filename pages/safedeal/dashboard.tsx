// pages/safedeal/dashboard.tsx
// Customer SafeDeal Dashboard — View and manage your cases

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SharedStatusBadge from '@/components/shared/StatusBadge';
import {
  Shield,
  FileCheck,
  Search,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  Upload,
  AlertCircle,
} from 'lucide-react';

/* ─── Types ─── */

interface SafeDealCaseListItem {
  _id: string;
  caseNumber: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  assessment?: unknown;
  consultation?: { scheduledAt?: string };
  reference?: {
    externalPropertyName?: string;
    propertyId?: string;
    projectId?: string;
  };
}

/* ─── Config ─── */

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; className?: string }> = {
  submitted: {
    label: 'Submitted',
    icon: <Clock className="w-3 h-3" />,
    tone: 'neutral',
  },
  under_review: {
    label: 'Under Review',
    icon: <Eye className="w-3 h-3" />,
    tone: 'info',
  },
  documents_required: {
    label: 'Documents Needed',
    icon: <AlertCircle className="w-3 h-3" />,
    tone: 'warning',
  },
  verification_in_progress: {
    label: 'Verification in Progress',
    icon: <Search className="w-3 h-3" />,
    // No shared tone for legacy violet -- full className override keeps it.
    tone: 'neutral',
    className: 'bg-violet-100 text-violet-700',
  },
  consultation_scheduled: {
    label: 'Consultation Scheduled',
    icon: <MessageSquare className="w-3 h-3" />,
    tone: 'success',
  },
  assessment_completed: {
    label: 'Assessment Ready',
    icon: <CheckCircle className="w-3 h-3" />,
    tone: 'success',
  },
  closed: {
    label: 'Closed',
    icon: <CheckCircle className="w-3 h-3" />,
    tone: 'neutral',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle className="w-3 h-3" />,
    tone: 'danger',
  },
};

const TYPE_LABELS: Record<string, string> = {
  property_review: 'Property Document Review',
  project_review: 'Project Due Diligence',
  investment_consultation: 'Investment Consultation',
  external_property_check: 'External Property Check',
  seller_verification: 'Seller/Agent Verification',
  developer_check: 'Developer Background Check',
  society_noc_check: 'Society NOC & Approval Check',
  general_inquiry: 'General Inquiry',
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProgressPercent(status: string): number {
  const progressMap: Record<string, number> = {
    submitted: 15,
    under_review: 30,
    documents_required: 40,
    verification_in_progress: 60,
    consultation_scheduled: 75,
    assessment_completed: 90,
    closed: 100,
    cancelled: 0,
  };
  return progressMap[status] ?? 0;
}

function getProgressLabel(status: string): string {
  const labelMap: Record<string, string> = {
    submitted: 'Case submitted — awaiting review',
    under_review: 'Under review by SafeDeal team',
    documents_required: 'Waiting for your documents',
    verification_in_progress: 'Verification checks in progress',
    consultation_scheduled: 'Consultation scheduled',
    assessment_completed: 'Assessment ready for review',
    closed: 'Case completed',
    cancelled: 'Case cancelled',
  };
  return labelMap[status] ?? 'In progress';
}

// Thin delegation to the shared design-system badge. The `status`-prop API and
// the STATUS_CONFIG semantic map stay local; only presentation is shared.
function StatusBadge({ status }: { status: string }): React.ReactElement {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;
  return (
    <SharedStatusBadge
      tone={cfg.tone}
      icon={cfg.icon}
      label={cfg.label}
      className={cfg.className}
    />
  );
}

function PriorityBadge({ priority }: { priority: string }): React.ReactElement {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`${iconBg} ${iconColor} w-11 h-11 rounded-xl flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function CaseCard({ caseItem }: { caseItem: SafeDealCaseListItem }): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all">
      <Link href={`/safedeal/dashboard/${caseItem._id}`} className="block p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#029bba]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-gray-900 truncate">{caseItem.caseNumber}</span>
                <StatusBadge status={caseItem.status} />
                <PriorityBadge priority={caseItem.priority} />
              </div>
              <p className="text-sm font-semibold text-gray-700 truncate">
                {TYPE_LABELS[caseItem.type] ?? caseItem.type}
              </p>
              <p className="text-xs text-gray-500 truncate mt-1">
                {caseItem.reference?.externalPropertyName
                  ? caseItem.reference.externalPropertyName
                  : caseItem.reference?.propertyId
                    ? `Property: ${caseItem.reference.propertyId}`
                    : caseItem.reference?.projectId
                      ? `Project: ${caseItem.reference.projectId}`
                      : 'General inquiry'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-gray-500 mb-1">Created</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(caseItem.createdAt)}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Updated: {formatDate(caseItem.updatedAt)}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span className="font-semibold text-gray-900">{getProgressLabel(caseItem.status)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#029bba] transition-all"
              style={{ width: `${getProgressPercent(caseItem.status)}%` }}
            />
          </div>
        </div>
      </Link>

      {/* Actions outside main Link to avoid nested <a> */}
      <div className="px-5 pb-5 flex items-center justify-between pt-0">
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap border-t border-gray-100 pt-3 w-full">
          {caseItem.assessment != null && (
            <Link
              href={`/safedeal/dashboard/${caseItem._id}?tab=assessment`}
              className="flex items-center gap-1 text-[#029bba] font-semibold hover:underline"
            >
              <FileCheck className="w-3.5 h-3.5" />
              View Assessment
            </Link>
          )}
          {caseItem.consultation?.scheduledAt && (
            <Link
              href={`/safedeal/dashboard/${caseItem._id}?tab=consultation`}
              className="flex items-center gap-1 text-[#029bba] font-semibold hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Consultation: {formatDate(caseItem.consultation.scheduledAt)}
            </Link>
          )}
          {caseItem.status === 'documents_required' && (
            <Link
              href={`/safedeal/dashboard/${caseItem._id}?tab=documents`}
              className="flex items-center gap-1 text-amber-600 font-semibold hover:underline"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Documents
            </Link>
          )}
          <span className="ml-auto">
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function SafeDealDashboardPage() {
  const { status } = useSession();

  const [cases, setCases] = useState<SafeDealCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCases = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
          status: statusFilter,
          search: searchQuery,
        });

        const res = await fetch(`/api/safedeal?${params.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load cases');

        const data = (await res.json()) as {
          success?: boolean;
          cases?: SafeDealCaseListItem[];
          pagination?: { total: number; totalPages: number };
        };

        if (data.success && data.cases) {
          setCases(data.cases);
          setPagination((prev) => ({
            ...prev,
            total: data.pagination?.total ?? 0,
            totalPages: data.pagination?.totalPages ?? 1,
          }));
        }
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.page, pagination.limit, statusFilter, searchQuery]
  );

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchCases();
    }
  }, [fetchCases, status]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter, searchQuery]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your SafeDeal cases...</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null; // Middleware will redirect to login
  }

  const activeCases = cases.filter((c) => !['closed', 'cancelled'].includes(c.status)).length;
  const completedCases = cases.filter((c) => c.status === 'assessment_completed').length;
  const needsActionCases = cases.filter(
    (c) => c.status === 'documents_required' || c.status === 'consultation_scheduled'
  ).length;

  return (
    <>
      <Head>
        <title>My SafeDeal Cases | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#029bba]" />
                My SafeDeal Cases
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track and manage your property protection cases
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchCases(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/safedeal"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
              >
                <Shield className="w-4 h-4" />
                New Case
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Cases"
              value={cases.length}
              icon={<Shield className="w-5 h-5" />}
              iconBg="bg-[#029bba]/10"
              iconColor="text-[#029bba]"
            />
            <StatCard
              label="Active"
              value={activeCases}
              icon={<Eye className="w-5 h-5" />}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Need Action"
              value={needsActionCases}
              icon={<AlertTriangle className="w-5 h-5" />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Completed"
              value={completedCases}
              icon={<CheckCircle className="w-5 h-5" />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search case number, property, or type..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="sm:w-[180px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="documents_required">Documents Needed</option>
                <option value="verification_in_progress">Verification in Progress</option>
                <option value="consultation_scheduled">Consultation Scheduled</option>
                <option value="assessment_completed">Assessment Ready</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {(statusFilter !== 'all' || searchQuery) && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors"
                  >
                    {STATUS_CONFIG[statusFilter]?.label}
                    <XCircle className="w-3 h-3" />
                  </button>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors"
                  >
                    &ldquo;{searchQuery}&rdquo;
                    <XCircle className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading cases...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold mb-4">{error}</p>
              <button
                type="button"
                onClick={() => void fetchCases()}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Shield className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No SafeDeal Cases Yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                {statusFilter !== 'all' || searchQuery
                  ? 'No cases match your filters. Try adjusting or clearing your filters.'
                  : 'Start your first property protection case today.'}
              </p>
              {statusFilter !== 'all' || searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  href="/safedeal"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Start Your First Case
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cases.map((caseItem) => (
                  <CaseCard key={caseItem._id} caseItem={caseItem} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-8">
                  <button
                    type="button"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-xs font-bold text-gray-700 px-3">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}