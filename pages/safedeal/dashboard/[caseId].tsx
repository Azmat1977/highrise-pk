// pages/safedeal/dashboard/[caseId].tsx
// Customer SafeDeal Case Detail — View case details, assessment, documents, consultation

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Shield,
  FileCheck,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  MessageSquare,
  Download,
  Upload,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  FileText,
  Calendar,
  Search,
} from 'lucide-react';

/* ─── Types ─── */

interface SafeDealCustomer {
  name: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
}

interface SafeDealReference {
  externalPropertyName?: string;
  externalPropertyAddress?: string;
  externalPropertyCity?: string;
  propertyId?: string;
  propertySlug?: string;
  projectId?: string;
  projectSlug?: string;
  agentId?: string;
  agentSlug?: string;
  developerId?: string;
  developerSlug?: string;
  societyId?: string;
  societySlug?: string;
}

interface SafeDealFinding {
  category: string;
  check: string;
  status: string;
  evidence?: string;
  notes?: string;
}

interface SafeDealAssessment {
  riskLevel?: string;
  completedAt?: string;
  summary?: string;
  findings?: SafeDealFinding[];
  outstandingActions?: string[];
  recommendedNextSteps?: string[];
  dependencies?: string[];
}

interface SafeDealDocument {
  title: string;
  type: string;
  url: string;
  uploadedAt: string;
}

interface SafeDealConsultation {
  scheduledAt?: string;
  mode?: string;
  durationMinutes?: number;
  meetingLink?: string;
  notes?: string;
  completedAt?: string;
}

interface SafeDealAuditEntry {
  action: string;
  performedAt: string;
  note?: string;
  changes?: Record<string, unknown>;
}

interface SafeDealNote {
  content: string;
  createdAt: string;
  isCustomerVisible?: boolean;
}

interface SafeDealCase {
  _id: string;
  caseNumber: string;
  type: string;
  status: string;
  priority: string;
  description: string;
  questions?: string[];
  proposedInvestment?: {
    amount?: number;
    currency?: string;
    purpose?: string;
  };
  reference?: SafeDealReference;
  customer: SafeDealCustomer;
  scopeAcknowledgedAt: string;
  assessment?: SafeDealAssessment;
  documents?: SafeDealDocument[];
  consultation?: SafeDealConsultation;
  auditTrail?: SafeDealAuditEntry[];
  internalNotes?: SafeDealNote[];
  assignedTo?: { name: string };
  createdAt: string;
  updatedAt: string;
}

type TabId = 'overview' | 'assessment' | 'documents' | 'consultation' | 'timeline';

/* ─── Config ─── */

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string; progress: number }
> = {
  submitted: {
    label: 'Submitted',
    icon: <Clock className="w-3 h-3" />,
    className: 'bg-gray-100 text-gray-700',
    progress: 15,
  },
  under_review: {
    label: 'Under Review',
    icon: <Eye className="w-3 h-3" />,
    className: 'bg-blue-100 text-blue-700',
    progress: 30,
  },
  documents_required: {
    label: 'Documents Needed',
    icon: <AlertCircle className="w-3 h-3" />,
    className: 'bg-amber-100 text-amber-700',
    progress: 40,
  },
  verification_in_progress: {
    label: 'Verification in Progress',
    icon: <Search className="w-3 h-3" />,
    className: 'bg-violet-100 text-violet-700',
    progress: 60,
  },
  consultation_scheduled: {
    label: 'Consultation Scheduled',
    icon: <MessageSquare className="w-3 h-3" />,
    className: 'bg-emerald-100 text-emerald-700',
    progress: 75,
  },
  assessment_completed: {
    label: 'Assessment Ready',
    icon: <CheckCircle className="w-3 h-3" />,
    className: 'bg-emerald-100 text-emerald-700',
    progress: 90,
  },
  closed: {
    label: 'Closed',
    icon: <CheckCircle className="w-3 h-3" />,
    className: 'bg-gray-100 text-gray-600',
    progress: 100,
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle className="w-3 h-3" />,
    className: 'bg-red-100 text-red-700',
    progress: 0,
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

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ownership_proof: 'Ownership Proof',
  seller_cnic: 'Seller CNIC',
  property_photos: 'Property Photos',
  payment_proof: 'Payment Proof',
  contract_agreement: 'Contract/Agreement',
  noc_certificate: 'NOC Certificate',
  approval_letter: 'Approval Letter',
  developer_brochure: 'Developer Brochure',
  floor_plan: 'Floor Plan',
  bank_statement: 'Bank Statement',
  other: 'Other Document',
};

const CHECKLIST_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  verified: {
    label: 'Verified',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    className: 'bg-emerald-100 text-emerald-700',
  },
  supplied_not_verified: {
    label: 'Supplied (Not Verified)',
    icon: <FileText className="w-3.5 h-3.5" />,
    className: 'bg-blue-100 text-blue-700',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-600',
  },
  not_applicable: {
    label: 'Not Applicable',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-500',
  },
  concern: {
    label: 'Concern',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    className: 'bg-red-100 text-red-700',
  },
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

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-full ${cfg.className}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }): React.ReactElement {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-full ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }): React.ReactElement {
  return (
    <span className="px-3 py-1 text-sm font-semibold bg-[#029bba]/10 text-[#029bba] rounded-full">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function ChecklistStatusBadge({ status }: { status: string }): React.ReactElement {
  const cfg = CHECKLIST_STATUS_CONFIG[status] ?? CHECKLIST_STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${cfg.className}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DocumentCard({ doc }: { doc: SafeDealDocument }): React.ReactElement {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-[#029bba]/40 hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[#029bba]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{doc.title}</p>
          <p className="text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[#029bba] font-semibold text-sm hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
        <span className="text-xs text-gray-500">Uploaded {formatDateShort(doc.uploadedAt)}</span>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function SafeDealCaseDetailPage() {
  const router = useRouter();
  const { status } = useSession();

  const [caseData, setCaseData] = useState<SafeDealCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { caseId } = router.query;

  const fetchCase = useCallback(async () => {
    if (!caseId || typeof caseId !== 'string') return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/safedeal/${caseId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Case not found');
        throw new Error('Failed to load case');
      }
      const data = (await res.json()) as { success?: boolean; case?: SafeDealCase };
      if (data.success && data.case) {
        setCaseData(data.case);
      } else {
        throw new Error('Failed to load case');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchCase();
    }
  }, [fetchCase, status]);

  // Honour ?tab= from URL when present
  useEffect(() => {
    const tab = router.query.tab;
    if (
      tab === 'overview' ||
      tab === 'assessment' ||
      tab === 'documents' ||
      tab === 'consultation' ||
      tab === 'timeline'
    ) {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadingDoc(true);
    setUploadError('');
    try {
      // Placeholder: wire to Cloudinary /api/upload when upload API is ready
      setUploadError(
        'Document upload will be available once the upload API is connected. Your file selection was received.'
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading && !caseData && !error)) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') return null;

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-md w-full">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#004063] mb-2">Unable to Load Case</h2>
          <p className="text-[#666666] mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => void fetchCase()}
              className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#017a8a] transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/safedeal/dashboard"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-[#333333] font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const statusCfg = STATUS_CONFIG[caseData.status] ?? STATUS_CONFIG.submitted;

  const tabs: { id: TabId; label: string; icon: typeof Shield; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'assessment', label: 'Assessment', icon: FileCheck, disabled: !caseData.assessment },
    { id: 'documents', label: 'Documents', icon: FileText },
    {
      id: 'consultation',
      label: 'Consultation',
      icon: MessageSquare,
      disabled: !caseData.consultation,
    },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  const visibleNotes =
    caseData.internalNotes?.filter((n) => n.isCustomerVisible) ?? [];

  return (
    <>
      <Head>
        <title>{caseData.caseNumber} | SafeDeal Dashboard | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/safedeal/dashboard"
                  className="p-2 rounded-xl text-gray-500 hover:text-[#029bba] hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/safedeal/dashboard"
                      className="text-sm text-gray-500 hover:text-[#029bba]"
                    >
                      Dashboard
                    </Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-sm font-semibold text-gray-700">{caseData.caseNumber}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {TYPE_LABELS[caseData.type] ?? caseData.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
              </div>
            </div>

            {/* Mobile progress */}
            <div className="lg:hidden pb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Progress</span>
                <span className="font-semibold text-gray-900">{statusCfg.label}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#029bba] transition-all"
                  style={{ width: `${statusCfg.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body: content + sidebar */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main */}
            <div className="flex-1 min-w-0 max-w-[1120px]">
              {/* Tabs */}
              <div className="mb-8">
                <nav
                  className="flex flex-wrap gap-1 bg-white rounded-2xl border border-gray-100 p-1"
                  role="tablist"
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      onClick={() => {
                        if (!tab.disabled) setActiveTab(tab.id);
                      }}
                      disabled={tab.disabled}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'bg-[#029bba] text-white shadow-sm'
                          : tab.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[#029bba]'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* ── Overview ── */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <TypeBadge type={caseData.type} />
                          <StatusBadge status={caseData.status} />
                          <PriorityBadge priority={caseData.priority} />
                        </div>
                        <h1 className="text-2xl font-black text-[#004063] mb-2">
                          {caseData.caseNumber}
                        </h1>
                        <p className="text-gray-600">
                          Submitted on {formatDate(caseData.createdAt)} • Updated{' '}
                          {formatDate(caseData.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setActiveTab('assessment')}
                          disabled={!caseData.assessment}
                          className="px-6 py-3 rounded-xl bg-[#029bba] text-white font-bold hover:bg-[#027a94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          View Assessment
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('documents')}
                          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                        >
                          Documents
                        </button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 mt-6">
                      <h3 className="text-lg font-bold text-[#004063] mb-3">Case Description</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {caseData.description}
                      </p>
                    </div>

                    {caseData.questions && caseData.questions.length > 0 && (
                      <div className="pt-6 border-t border-gray-100 mt-6">
                        <h3 className="text-lg font-bold text-[#004063] mb-3">Your Questions</h3>
                        <ul className="space-y-2">
                          {caseData.questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                              <HelpCircle className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {caseData.proposedInvestment?.amount != null && (
                      <div className="pt-6 border-t border-gray-100 mt-6">
                        <h3 className="text-lg font-bold text-[#004063] mb-3">
                          Proposed Investment
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Amount
                            </p>
                            <p className="text-xl font-black text-[#029bba]">
                              {caseData.proposedInvestment.amount.toLocaleString()}{' '}
                              {caseData.proposedInvestment.currency ?? 'PKR'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Purpose
                            </p>
                            <p className="text-gray-700">
                              {caseData.proposedInvestment.purpose ?? 'Not specified'}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Currency
                            </p>
                            <p className="text-gray-700">
                              {caseData.proposedInvestment.currency ?? 'PKR'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 mt-6">
                      <h3 className="text-lg font-bold text-[#004063] mb-3">Reference Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {caseData.reference?.externalPropertyName && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              External Property
                            </p>
                            <p className="font-semibold text-gray-900">
                              {caseData.reference.externalPropertyName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {caseData.reference.externalPropertyAddress}
                            </p>
                            <p className="text-sm text-gray-600">
                              {caseData.reference.externalPropertyCity}
                            </p>
                          </div>
                        )}
                        {caseData.reference?.propertyId && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Property Reference
                            </p>
                            <p className="font-semibold text-[#029bba]">
                              {caseData.reference.propertyId}
                            </p>
                            {caseData.reference.propertySlug && (
                              <p className="text-sm text-gray-600 mt-1">
                                Slug: {caseData.reference.propertySlug}
                              </p>
                            )}
                          </div>
                        )}
                        {caseData.reference?.projectId && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Project Reference
                            </p>
                            <p className="font-semibold text-[#029bba]">
                              {caseData.reference.projectId}
                            </p>
                            {caseData.reference.projectSlug && (
                              <p className="text-sm text-gray-600 mt-1">
                                Slug: {caseData.reference.projectSlug}
                              </p>
                            )}
                          </div>
                        )}
                        {caseData.reference?.agentId && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Agent Reference
                            </p>
                            <p className="font-semibold text-[#029bba]">
                              {caseData.reference.agentId}
                            </p>
                            {caseData.reference.agentSlug && (
                              <p className="text-sm text-gray-600 mt-1">
                                Slug: {caseData.reference.agentSlug}
                              </p>
                            )}
                          </div>
                        )}
                        {caseData.reference?.developerId && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Developer Reference
                            </p>
                            <p className="font-semibold text-[#029bba]">
                              {caseData.reference.developerId}
                            </p>
                            {caseData.reference.developerSlug && (
                              <p className="text-sm text-gray-600 mt-1">
                                Slug: {caseData.reference.developerSlug}
                              </p>
                            )}
                          </div>
                        )}
                        {caseData.reference?.societyId && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                              Society Reference
                            </p>
                            <p className="font-semibold text-[#029bba]">
                              {caseData.reference.societyId}
                            </p>
                            {caseData.reference.societySlug && (
                              <p className="text-sm text-gray-600 mt-1">
                                Slug: {caseData.reference.societySlug}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 mt-6">
                      <h3 className="text-lg font-bold text-[#004063] mb-3">Your Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                            Name
                          </p>
                          <p className="font-semibold text-gray-900">{caseData.customer.name}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                            Email
                          </p>
                          <p className="font-semibold text-gray-900">{caseData.customer.email}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                            Phone
                          </p>
                          <p className="font-semibold text-gray-900">{caseData.customer.phone}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                            Preferred Contact
                          </p>
                          <p className="font-semibold text-gray-900 capitalize">
                            {caseData.customer.preferredContactMethod.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-2">
                          Scope Acknowledgement
                        </p>
                        <p className="text-xs text-amber-700">
                          You acknowledged the SafeDeal service scope and limitations on{' '}
                          {formatDate(caseData.scopeAcknowledgedAt)}. SafeDeal provides
                          professional due-diligence assessment and consultancy — not legal advice,
                          financial advice, or guaranteed protection against fraud. See our{' '}
                          <Link href="/terms-of-service" className="text-[#029bba] hover:underline">
                            Terms of Service
                          </Link>{' '}
                          for full details.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Assessment ── */}
              {activeTab === 'assessment' && caseData.assessment && (
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h2 className="text-xl font-black text-[#004063] flex items-center gap-2">
                        <FileCheck className="w-6 h-6 text-[#029bba]" />
                        Assessment Report
                      </h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                            caseData.assessment.riskLevel === 'high'
                              ? 'bg-red-100 text-red-700'
                              : caseData.assessment.riskLevel === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Risk:{' '}
                          {caseData.assessment.riskLevel
                            ? caseData.assessment.riskLevel.charAt(0).toUpperCase() +
                              caseData.assessment.riskLevel.slice(1)
                            : 'Medium'}
                        </span>
                        {caseData.assessment.completedAt && (
                          <span className="text-xs text-gray-500">
                            Completed {formatDate(caseData.assessment.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {caseData.assessment.summary && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Executive Summary</h3>
                        <p className="text-gray-700 leading-relaxed">
                          {caseData.assessment.summary}
                        </p>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-[#004063] mb-4 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-[#029bba]" />
                        Due-Diligence Findings
                      </h3>
                      {caseData.assessment.findings && caseData.assessment.findings.length > 0 ? (
                        <div className="space-y-3">
                          {caseData.assessment.findings.map((finding, i) => (
                            <div
                              key={i}
                              className="bg-white rounded-xl border border-gray-100 p-5"
                            >
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                      {finding.category}
                                    </span>
                                    <ChecklistStatusBadge status={finding.status} />
                                  </div>
                                  <p className="font-semibold text-gray-900">{finding.check}</p>
                                </div>
                              </div>
                              {finding.evidence && (
                                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                                    Evidence / Notes
                                  </p>
                                  <p className="text-sm text-gray-700">{finding.evidence}</p>
                                </div>
                              )}
                              {finding.notes && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                  <p className="text-xs text-amber-800 font-semibold mb-1">
                                    Analyst Notes
                                  </p>
                                  <p className="text-sm text-amber-700">{finding.notes}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No findings recorded yet.
                        </div>
                      )}
                    </div>

                    {caseData.assessment.outstandingActions &&
                      caseData.assessment.outstandingActions.length > 0 && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                          <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Outstanding Actions Required
                          </h3>
                          <ul className="list-disc list-inside space-y-2 text-sm text-amber-700">
                            {caseData.assessment.outstandingActions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {caseData.assessment.recommendedNextSteps &&
                      caseData.assessment.recommendedNextSteps.length > 0 && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Recommended Next Steps
                          </h3>
                          <ul className="list-disc list-inside space-y-2 text-sm text-emerald-700">
                            {caseData.assessment.recommendedNextSteps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {caseData.assessment.dependencies &&
                      caseData.assessment.dependencies.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            External Dependencies
                          </h3>
                          <p className="text-xs text-blue-700 mb-3">
                            The following items require external verification or official records:
                          </p>
                          <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
                            {caseData.assessment.dependencies.map((dep, i) => (
                              <li key={i}>{dep}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* ── Documents ── */}
              {activeTab === 'documents' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-xl font-black text-[#004063] mb-4 flex items-center gap-2">
                      <Upload className="w-6 h-6 text-[#029bba]" />
                      Your Documents
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Upload supporting documents for your case. Max 10MB per file. Accepted: PDF,
                      JPG, PNG, WebP.
                    </p>

                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors">
                      <input
                        type="file"
                        id="doc-upload"
                        accept=".pdf,image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleDocumentUpload(e)}
                        disabled={uploadingDoc}
                      />
                      <label htmlFor="doc-upload" className="cursor-pointer">
                        {uploadingDoc ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
                            <p className="text-gray-600">Uploading...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <Upload className="w-12 h-12 text-gray-300" />
                            <p className="text-gray-600 font-medium">Click to upload documents</p>
                            <p className="text-xs text-gray-400">
                              PDF, JPG, PNG, WebP • Max 10MB each
                            </p>
                          </div>
                        )}
                      </label>
                      {uploadError && (
                        <p className="mt-3 text-sm text-amber-700 flex items-center justify-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {uploadError}
                        </p>
                      )}
                    </div>

                    {caseData.documents && caseData.documents.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Uploaded Documents ({caseData.documents.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {caseData.documents.map((doc, i) => (
                            <DocumentCard key={`${doc.url}-${i}`} doc={doc} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Consultation ── */}
              {activeTab === 'consultation' && caseData.consultation && (
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-xl font-black text-[#004063] mb-6 flex items-center gap-2">
                      <MessageSquare className="w-6 h-6 text-[#029bba]" />
                      Consultation Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {caseData.consultation.scheduledAt && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                                Scheduled For
                              </p>
                              <p className="text-lg font-bold text-gray-900">
                                {formatDate(caseData.consultation.scheduledAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {caseData.consultation.mode && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                                Mode
                              </p>
                              <p className="text-lg font-bold text-gray-900 capitalize">
                                {caseData.consultation.mode.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {caseData.consultation.durationMinutes != null && (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                                Duration
                              </p>
                              <p className="text-lg font-bold text-gray-900">
                                {caseData.consultation.durationMinutes} minutes
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {caseData.consultation.meetingLink && (
                        <div className="bg-violet-50 border border-violet-100 rounded-xl p-6 md:col-span-2">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                              <ArrowRight className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                                Meeting Link
                              </p>
                              <a
                                href={caseData.consultation.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#029bba] font-semibold hover:underline break-all"
                              >
                                {caseData.consultation.meetingLink}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      {caseData.consultation.notes && (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 md:col-span-2">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                            Notes
                          </p>
                          <p className="text-gray-700">{caseData.consultation.notes}</p>
                        </div>
                      )}
                    </div>

                    {caseData.consultation.completedAt && (
                      <div className="pt-6 border-t border-gray-100">
                        <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Consultation completed on{' '}
                          {formatDate(caseData.consultation.completedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Timeline ── */}
              {activeTab === 'timeline' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-xl font-black text-[#004063] mb-6 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-[#029bba]" />
                    Case Timeline
                  </h2>
                  <div className="space-y-6">
                    {(caseData.auditTrail ?? []).map((entry, i, arr) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#029bba] border-2 border-white z-10" />
                          {i < arr.length - 1 && <div className="w-0.5 flex-1 min-h-[2rem] bg-gray-200" />}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              {entry.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(entry.performedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium capitalize">
                            {entry.action.replace(/_/g, ' ')}
                          </p>
                          {entry.note && (
                            <p className="text-xs text-gray-500 mt-1">{entry.note}</p>
                          )}
                          {entry.changes && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-100 text-xs">
                              <pre className="text-gray-600 overflow-x-auto">
                                {JSON.stringify(entry.changes, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {visibleNotes.length > 0 && (
                      <div className="pt-6 border-t border-gray-100">
                        <h3 className="text-lg font-bold text-[#004063] mb-4">Team Notes</h3>
                        <div className="space-y-3">
                          {visibleNotes.map((note, i) => (
                            <div
                              key={i}
                              className="bg-blue-50 border border-blue-100 rounded-xl p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-blue-700">
                                  Note from Team
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(note.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-blue-800">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(caseData.auditTrail ?? []).length === 0 && visibleNotes.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No timeline events yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6 bg-white border border-gray-100 rounded-2xl p-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Case Progress
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const isActive = key === caseData.status;
                      const isCompleted = cfg.progress > 0 && cfg.progress <= statusCfg.progress;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isActive
                                ? 'bg-[#029bba] text-white'
                                : isCompleted
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {isCompleted || isActive ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              cfg.icon
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold ${
                                isActive
                                  ? 'text-[#029bba]'
                                  : isCompleted
                                    ? 'text-emerald-700'
                                    : 'text-gray-500'
                              }`}
                            >
                              {cfg.label}
                            </p>
                            <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isActive
                                    ? 'bg-[#029bba]'
                                    : isCompleted
                                      ? 'bg-emerald-500'
                                      : 'bg-gray-200'
                                }`}
                                style={{ width: `${isActive || isCompleted ? 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Quick Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Case Number</span>
                      <span className="font-semibold font-mono text-[#029bba]">
                        {caseData.caseNumber}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Type</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {TYPE_LABELS[caseData.type] ?? caseData.type}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Submitted</span>
                      <span className="font-semibold text-gray-900">
                        {formatDateShort(caseData.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Last Update</span>
                      <span className="font-semibold text-gray-900">
                        {formatDateShort(caseData.updatedAt)}
                      </span>
                    </div>
                    {caseData.assignedTo && (
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Assigned To</span>
                        <span className="font-semibold text-[#029bba]">
                          {caseData.assignedTo.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}