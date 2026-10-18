// pages/admin/safedeal/[caseId].tsx
// Admin SafeDeal Case Detail — View and edit case, assessment, consultation, notes

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Shield, FileCheck, Eye, Clock, AlertTriangle, CheckCircle, XCircle,
  Loader2, ChevronLeft, MessageSquare, Download, Upload, AlertCircle,
  HelpCircle, ArrowRight, FileText, Calendar, Search, Plus, Trash2, Save
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
  assignedTo?: { name: string; _id?: string };
  createdAt: string;
  updatedAt: string;
}

type TabId = 'overview' | 'assessment' | 'documents' | 'consultation' | 'timeline' | 'notes';

/* ─── Config ─── */

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  submitted: { label: 'Submitted', icon: <Clock className="w-3 h-3" />, className: 'bg-gray-100 text-gray-700' },
  under_review: { label: 'Under Review', icon: <Eye className="w-3 h-3" />, className: 'bg-blue-100 text-blue-700' },
  documents_required: { label: 'Documents Needed', icon: <AlertCircle className="w-3 h-3" />, className: 'bg-amber-100 text-amber-700' },
  verification_in_progress: { label: 'Verification in Progress', icon: <Search className="w-3 h-3" />, className: 'bg-violet-100 text-violet-700' },
  consultation_scheduled: { label: 'Consultation Scheduled', icon: <MessageSquare className="w-3 h-3" />, className: 'bg-emerald-100 text-emerald-700' },
  assessment_completed: { label: 'Assessment Ready', icon: <CheckCircle className="w-3 h-3" />, className: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Closed', icon: <CheckCircle className="w-3 h-3" />, className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', icon: <XCircle className="w-3 h-3" />, className: 'bg-red-100 text-red-700' },
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

const CHECKLIST_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  verified: { label: 'Verified', icon: <CheckCircle className="w-3.5 h-3.5" />, className: 'bg-emerald-100 text-emerald-700' },
  supplied_not_verified: { label: 'Supplied (Not Verified)', icon: <FileText className="w-3.5 h-3.5" />, className: 'bg-blue-100 text-blue-700' },
  pending: { label: 'Pending', icon: <Clock className="w-3.5 h-3.5" />, className: 'bg-gray-100 text-gray-600' },
  not_applicable: { label: 'Not Applicable', icon: <XCircle className="w-3.5 h-3.5" />, className: 'bg-gray-100 text-gray-500' },
  concern: { label: 'Concern', icon: <AlertTriangle className="w-3.5 h-3.5" />, className: 'bg-red-100 text-red-700' },
};

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-full ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="px-3 py-1 text-sm font-semibold bg-[#029bba]/10 text-[#029bba] rounded-full">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function ChecklistStatusBadge({ status }: { status: string }) {
  const cfg = CHECKLIST_STATUS_CONFIG[status] ?? CHECKLIST_STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-semibold text-gray-900 text-sm text-right">{value}</span>
    </div>
  );
}

function DocumentCard({ doc, admin, index, onDelete }: { doc: SafeDealDocument; admin?: boolean; index?: number; onDelete?: (idx: number) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[#029bba]" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 truncate">{doc.title}</p>
          <div className="flex gap-2 items-center text-xs">
            <span className="text-gray-500">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">{formatDateShort(doc.uploadedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-[#029bba] bg-[#029bba]/10 rounded-lg hover:bg-[#029bba]/20 transition-colors">
          <Download className="w-4 h-4" />
        </a>
        {admin && onDelete && typeof index === 'number' && (
          <button onClick={() => onDelete(index)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function AdminSafeDealCaseDetailPage() {
  const router = useRouter();
  const { status } = useSession();
  const { caseId } = router.query;

  const [caseData, setCaseData] = useState<SafeDealCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Form states
  const [editStatus, setEditStatus] = useState('submitted');
  const [editPriority, setEditPriority] = useState('medium');
  const [assessmentData, setAssessmentData] = useState<SafeDealAssessment>({ findings: [] });
  const [consultationData, setConsultationData] = useState<SafeDealConsultation>({});
  const [newNote, setNewNote] = useState('');
  const [newNoteVisible, setNewNoteVisible] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!caseId || typeof caseId !== 'string') return;
    setLoading(true);
    setError('');
    try {
      // Using admin API route
      const res = await fetch(`/api/admin/safedeal/${caseId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Case not found');
      
      const data = await res.json() as { success?: boolean; case?: SafeDealCase };
      if (data.success && data.case) {
        setCaseData(data.case);
        setEditStatus(data.case.status);
        setEditPriority(data.case.priority);
        if (data.case.assessment) setAssessmentData(data.case.assessment);
        if (data.case.consultation) setConsultationData(data.case.consultation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchCase();
    }
  }, [fetchCase, status]);

  const handleUpdate = async (updates: Partial<SafeDealCase>) => {
    if (!caseId || typeof caseId !== 'string') return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/safedeal/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      if (data.success) {
        void fetchCase();
        alert('Case updated successfully!');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update case');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const noteObj = { content: newNote, isCustomerVisible: newNoteVisible, createdAt: new Date().toISOString() };
    const updatedNotes = [...(caseData?.internalNotes || []), noteObj];
    await handleUpdate({ internalNotes: updatedNotes });
    setNewNote('');
    setNewNoteVisible(false);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#029bba] animate-spin" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md w-full shadow-sm">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#004063] mb-2">Unable to Load Case</h2>
          <p className="text-[#666666] mb-6">{error || 'Case not found'}</p>
          <Link href="/admin/safedeal" className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#017a8a] transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/safedeal" className="p-2 rounded-xl text-gray-500 hover:text-[#029bba] hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Admin</span>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-semibold text-gray-700">{caseData.caseNumber}</span>
              </div>
              <p className="text-xs font-semibold text-[#029bba]">{TYPE_LABELS[caseData.type] ?? caseData.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
              {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
            </select>
            <select value={editPriority} onChange={e => setEditPriority(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
              {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p]?.label}</option>)}
            </select>
            <button onClick={() => void handleUpdate({ status: editStatus, priority: editPriority })} disabled={isSaving} className="px-4 py-2 bg-[#029bba] text-white font-semibold text-sm rounded-lg hover:bg-[#027a94] flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Status
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 bg-white rounded-xl border border-gray-100 p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'assessment', label: 'Assessment', icon: FileCheck },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'consultation', label: 'Consultation', icon: MessageSquare },
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'notes', label: 'Internal Notes', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-[#029bba] text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-[#029bba]'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#004063] mb-4">Case Overview</h3>
              <DetailRow label="Case Number" value={caseData.caseNumber} />
              <DetailRow label="Type" value={TYPE_LABELS[caseData.type]} />
              <DetailRow label="Submitted" value={formatDate(caseData.createdAt)} />
              <DetailRow label="Last Updated" value={formatDate(caseData.updatedAt)} />
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{caseData.description}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#004063] mb-4">Customer Info</h3>
                <DetailRow label="Name" value={caseData.customer.name} />
                <DetailRow label="Email" value={caseData.customer.email} />
                <DetailRow label="Phone" value={caseData.customer.phone} />
              </div>
              {caseData.proposedInvestment?.amount && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-lg font-bold text-[#004063] mb-4">Proposed Investment</h3>
                  <DetailRow label="Amount" value={`${caseData.proposedInvestment.amount.toLocaleString()} ${caseData.proposedInvestment.currency}`} />
                  <DetailRow label="Purpose" value={caseData.proposedInvestment.purpose || 'N/A'} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assessment Tab */}
        {activeTab === 'assessment' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#004063] flex items-center gap-2"><FileCheck className="w-5 h-5 text-[#029bba]" /> Assessment Editor</h2>
              <button onClick={() => void handleUpdate({ assessment: assessmentData })} disabled={isSaving} className="px-4 py-2 bg-[#029bba] text-white font-semibold rounded-lg hover:bg-[#027a94] flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Assessment
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Level</label>
                  <select value={assessmentData.riskLevel || 'medium'} onChange={e => setAssessmentData({...assessmentData, riskLevel: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none">
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Executive Summary</label>
                <textarea value={assessmentData.summary || ''} onChange={e => setAssessmentData({...assessmentData, summary: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" placeholder="Summarize the due diligence..."/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Findings</label>
                {(assessmentData.findings || []).map((finding, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <input type="text" placeholder="Category (e.g., Legal, Structural)" value={finding.category} onChange={e => {
                        const arr = [...(assessmentData.findings || [])]; arr[idx].category = e.target.value; setAssessmentData({...assessmentData, findings: arr});
                      }} className="px-3 py-2 border border-gray-200 rounded-md text-sm outline-none" />
                      <input type="text" placeholder="Check description" value={finding.check} onChange={e => {
                        const arr = [...(assessmentData.findings || [])]; arr[idx].check = e.target.value; setAssessmentData({...assessmentData, findings: arr});
                      }} className="px-3 py-2 border border-gray-200 rounded-md text-sm outline-none" />
                      <select value={finding.status} onChange={e => {
                        const arr = [...(assessmentData.findings || [])]; arr[idx].status = e.target.value; setAssessmentData({...assessmentData, findings: arr});
                      }} className="px-3 py-2 border border-gray-200 rounded-md text-sm outline-none">
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="concern">Concern</option>
                      </select>
                    </div>
                    <textarea placeholder="Evidence / Notes" value={finding.evidence || ''} onChange={e => {
                      const arr = [...(assessmentData.findings || [])]; arr[idx].evidence = e.target.value; setAssessmentData({...assessmentData, findings: arr});
                    }} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none" />
                  </div>
                ))}
                <button onClick={() => setAssessmentData(prev => ({...prev, findings: [...(prev.findings||[]), {category:'', check:'', status:'pending'}]}))} className="text-[#029bba] text-sm font-semibold flex items-center gap-1 hover:underline">
                  <Plus className="w-4 h-4" /> Add Finding
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recommended Next Steps (One per line)</label>
                <textarea value={(assessmentData.recommendedNextSteps || []).join('\n')} onChange={e => setAssessmentData({...assessmentData, recommendedNextSteps: e.target.value.split('\n').filter(s=>s.trim())})} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" placeholder="Step 1...&#10;Step 2..."/>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#004063] mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-[#029bba]" /> Case Documents</h2>
            {caseData.documents && caseData.documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {caseData.documents.map((doc, i) => (
                  <DocumentCard key={i} doc={doc} admin index={i} onDelete={(idx) => {
                     const docs = [...(caseData.documents || [])];
                     docs.splice(idx, 1);
                     void handleUpdate({ documents: docs });
                  }} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No documents uploaded for this case.</p>
            )}
          </div>
        )}

        {/* Consultation Tab */}
        {activeTab === 'consultation' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#004063] flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#029bba]" /> Consultation Schedule</h2>
              <button onClick={() => void handleUpdate({ consultation: consultationData })} disabled={isSaving} className="px-4 py-2 bg-[#029bba] text-white font-semibold rounded-lg hover:bg-[#027a94] flex items-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Scheduled Date & Time (ISO String)</label>
                <input type="text" value={consultationData.scheduledAt || ''} onChange={e => setConsultationData({...consultationData, scheduledAt: e.target.value})} placeholder="e.g., 2024-05-10T14:30:00Z" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                  <select value={consultationData.mode || 'video_call'} onChange={e => setConsultationData({...consultationData, mode: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm">
                    <option value="video_call">Video Call</option>
                    <option value="phone_call">Phone Call</option>
                    <option value="in_person">In Person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (mins)</label>
                  <input type="number" value={consultationData.durationMinutes || 30} onChange={e => setConsultationData({...consultationData, durationMinutes: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Meeting Link</label>
                <input type="text" value={consultationData.meetingLink || ''} onChange={e => setConsultationData({...consultationData, meetingLink: e.target.value})} placeholder="https://zoom.us/j/..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Notes for Meeting</label>
                <textarea value={consultationData.notes || ''} onChange={e => setConsultationData({...consultationData, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#004063] mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-[#029bba]" /> Internal Notes</h2>
            <div className="space-y-4 mb-8">
              {(caseData.internalNotes || []).map((note, i) => (
                <div key={i} className={`p-4 rounded-xl border ${note.isCustomerVisible ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold ${note.isCustomerVisible ? 'text-blue-700' : 'text-gray-500'}`}>
                      {note.isCustomerVisible ? 'Customer Visible' : 'Internal Only'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800">{note.content}</p>
                </div>
              ))}
              {(caseData.internalNotes || []).length === 0 && <p className="text-gray-500">No notes yet.</p>}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Add New Note</label>
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm mb-3" placeholder="Type note here..." />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={newNoteVisible} onChange={e => setNewNoteVisible(e.target.checked)} className="w-4 h-4 rounded text-[#029bba]" />
                  Make visible to customer
                </label>
                <button onClick={() => void handleAddNote()} disabled={isSaving || !newNote.trim()} className="px-4 py-2 bg-[#029bba] text-white font-semibold rounded-lg hover:bg-[#027a94] disabled:opacity-50">
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#004063] mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-[#029bba]" /> Audit Trail</h2>
            <div className="space-y-6">
              {(caseData.auditTrail || []).map((entry, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-[#029bba] border-2 border-white z-10" />
                    {i < arr.length - 1 && <div className="w-0.5 flex-1 min-h-[2rem] bg-gray-200" />}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">{entry.action.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-400">{formatDate(entry.performedAt)}</span>
                    </div>
                    {entry.note && <p className="text-sm text-gray-700">{entry.note}</p>}
                    {entry.changes && <pre className="text-xs text-gray-500 mt-2 p-2 bg-white rounded border border-gray-100 overflow-x-auto">{JSON.stringify(entry.changes, null, 2)}</pre>}
                  </div>
                </div>
              ))}
              {(caseData.auditTrail || []).length === 0 && <p className="text-gray-500">No events logged yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}