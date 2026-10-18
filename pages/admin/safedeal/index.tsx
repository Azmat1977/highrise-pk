// pages/admin/safedeal/index.tsx
// Admin SafeDeal Dashboard — Case Management

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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
  ChevronLeft,
  MessageSquare,
  AlertCircle,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  MapPin,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: null, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-full ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }): React.ReactElement {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }): React.ReactElement {
  const labels: Record<string, string> = {
    property_review: 'Property Review',
    project_review: 'Project Review',
    investment_consultation: 'Investment Consultation',
    external_property_check: 'External Property Check',
    seller_verification: 'Seller Verification',
    developer_check: 'Developer Check',
    society_noc_check: 'Society NOC Check',
    general_inquiry: 'General Inquiry',
  };
  return (
    <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#029bba]/10 text-[#029bba] rounded-full">
      {labels[type] ?? type}
    </span>
  );
}

function StatCard({ label, value, icon, iconBg, iconColor }: { label: string; value: number; icon: React.ReactNode; iconBg: string; iconColor: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`${iconBg} ${iconColor} w-11 h-11 rounded-xl flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function InfoCard({ label, value, icon, iconColor }: { label: string; value: string; icon: React.ReactNode; iconColor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`${iconColor} w-8 h-8 rounded-xl flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-white rounded-xl">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900 truncate">{value}</p>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="flex items-center gap-1 px-2.5 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full hover:bg-[#029bba]/20 transition-colors">
      {label}
      <XCircle className="w-3 h-3" />
    </button>
  );
}

export default function AdminSafeDealPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    assigned: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [counts, setCounts] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  const fetchCases = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        status: filters.status,
        type: filters.type,
        priority: filters.priority,
        assigned: filters.assigned,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      const res = await fetch(`/api/admin/safedeal?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load cases');

      const data = await res.json();
      if (data.success) {
        setCases(data.cases);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCases();
    }
  }, [fetchCases, status]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openDetail = (caseItem: any) => {
    setSelectedCase(caseItem);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedCase(null);
  };

  const confirmDelete = (caseId: string) => {
    setCaseToDelete(caseId);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!caseToDelete) return;
    try {
      const res = await fetch(`/api/admin/safedeal/${caseToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchCases(true);
      setShowDeleteConfirm(false);
      setCaseToDelete(null);
    } catch {
      alert('Failed to delete case');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading SafeDeal dashboard...</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') return null;

  return (
    <>
      <Head>
        <title>SafeDeal Management | Admin — Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#029bba]" />
                SafeDeal Case Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage and review all SafeDeal protection cases</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchCases(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Cases" value={counts?.all ?? cases.length} icon={<Shield className="w-5 h-5" />} iconBg="bg-[#029bba]/10" iconColor="text-[#029bba]" />
            <StatCard label="Active" value={cases.filter(c => !['closed', 'cancelled'].includes(c.status)).length} icon={<Eye className="w-5 h-5" />} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="Pending Review" value={counts?.submitted ?? 0} icon={<Clock className="w-5 h-5" />} iconBg="bg-gray-50" iconColor="text-gray-600" />
            <StatCard label="Need Action" value={cases.filter(c => ['documents_required', 'consultation_scheduled'].includes(c.status)).length} icon={<AlertTriangle className="w-5 h-5" />} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <StatCard label="Completed" value={counts?.assessment_completed ?? 0} icon={<CheckCircle className="w-5 h-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search case #, customer, property..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none text-sm"
                />
              </div>

              <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="sm:w-[150px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 outline-none">
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

              <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="sm:w-[180px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 outline-none">
                <option value="all">All Types</option>
                <option value="property_review">Property Review</option>
                <option value="project_review">Project Review</option>
                <option value="investment_consultation">Investment Consultation</option>
                <option value="external_property_check">External Property</option>
                <option value="seller_verification">Seller Verification</option>
                <option value="developer_check">Developer Check</option>
                <option value="society_noc_check">Society NOC</option>
                <option value="general_inquiry">General Inquiry</option>
              </select>

              <select value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)} className="sm:w-[130px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 outline-none">
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select value={filters.assigned} onChange={e => handleFilterChange('assigned', e.target.value)} className="sm:w-[150px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 outline-none">
                <option value="all">Assignment</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            {/* Active Filters */}
            {(filters.status !== 'all' || filters.type !== 'all' || filters.priority !== 'all' || filters.assigned !== 'all' || filters.search) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Filter className="w-3 h-3 text-gray-400" />
                {filters.status !== 'all' && <FilterChip label={filters.status} onClear={() => handleFilterChange('status', 'all')} />}
                {filters.type !== 'all' && <FilterChip label={filters.type} onClear={() => handleFilterChange('type', 'all')} />}
                {filters.priority !== 'all' && <FilterChip label={filters.priority} onClear={() => handleFilterChange('priority', 'all')} />}
                {filters.assigned !== 'all' && <FilterChip label={filters.assigned} onClear={() => handleFilterChange('assigned', 'all')} />}
                {filters.search && <FilterChip label={`"${filters.search}"`} onClear={() => handleFilterChange('search', '')} />}
                <button onClick={() => setFilters({ status: 'all', type: 'all', priority: 'all', assigned: 'all', search: '', sortBy: 'createdAt', sortOrder: 'desc' })} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear all</button>
              </div>
            )}
          </div>

          {/* Cases Table */}
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
              <button onClick={() => fetchCases()} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                Try Again
              </button>
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Shield className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No SafeDeal Cases Found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">No cases match your current filters.</p>
              <button onClick={() => setFilters({ status: 'all', type: 'all', priority: 'all', assigned: 'all', search: '', sortBy: 'createdAt', sortOrder: 'desc' })} className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Clear Filters</button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Case</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cases.map((caseItem) => (
                      <tr key={caseItem._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/admin/safedeal/${caseItem._id}`} className="font-mono font-bold text-[#029bba] hover:underline">{caseItem.caseNumber}</Link>
                          <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABELS[caseItem.type] ?? caseItem.type}</p>
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={caseItem.type} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{caseItem.customerName}</p>
                          <p className="text-xs text-gray-500">{caseItem.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                          {caseItem.reference?.externalPropertyName
                            ? `External: ${caseItem.reference.externalPropertyName}`
                            : caseItem.reference?.propertyId
                            ? `Property: ${caseItem.reference.propertyId}`
                            : caseItem.reference?.projectId
                            ? `Project: ${caseItem.reference.projectId}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={caseItem.status} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={caseItem.priority} />
                        </td>
                        <td className="px-4 py-3">
                          {caseItem.assignedTo ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{caseItem.assignedTo.name}</p>
                              <p className="text-xs text-gray-500">{caseItem.assignedTo.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(caseItem.createdAt)}</td>
                        <td className="px-4 py-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openDetail(caseItem)}
                              className="p-2 rounded-xl text-gray-500 hover:text-[#029bba] hover:bg-gray-100 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/admin/safedeal/${caseItem._id}`}
                              className="p-2 rounded-xl text-gray-500 hover:text-[#029bba] hover:bg-gray-100 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => confirmDelete(caseItem._id)}
                              className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-8">
                  <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs font-bold text-gray-700 px-3">Page {pagination.page} of {pagination.totalPages}</span>
                  <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </>
          )}

          {/* Detail Modal */}
          {showDetail && selectedCase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#004063] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#029bba]" />
                    {selectedCase.caseNumber}
                  </h2>
                  <button onClick={closeDetail} className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <TypeBadge type={selectedCase.type} />
                        <StatusBadge status={selectedCase.status} />
                        <PriorityBadge priority={selectedCase.priority} />
                      </div>
                      <h3 className="text-xl font-black text-[#004063]">{selectedCase.caseNumber}</h3>
                      <p className="text-sm text-gray-500">{TYPE_LABELS[selectedCase.type] ?? selectedCase.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <InfoCard label="Case Number" value={selectedCase.caseNumber} icon={<Shield className="w-4 h-4" />} iconColor="text-[#029bba]" />
                    <InfoCard label="Type" value={TYPE_LABELS[selectedCase.type] ?? selectedCase.type} icon={<FileCheck className="w-4 h-4" />} iconColor="text-blue-600" />
                    <InfoCard label="Customer" value={selectedCase.customerName} icon={<UserCheck className="w-4 h-4" />} iconColor="text-emerald-600" />
                    <InfoCard label="Email" value={selectedCase.customerEmail} icon={<Mail className="w-4 h-4" />} iconColor="text-blue-600" />
                    <InfoCard label="Assigned" value={selectedCase.assignedTo?.name ?? 'Unassigned'} icon={<UserCheck className="w-4 h-4" />} iconColor={selectedCase.assignedTo ? 'text-[#029bba]' : 'text-gray-400'} />
                    <InfoCard label="Created" value={formatDate(selectedCase.createdAt)} icon={<Calendar className="w-4 h-4" />} iconColor="text-gray-600" />
                    <InfoCard label="Updated" value={formatDate(selectedCase.updatedAt)} icon={<Clock className="w-4 h-4" />} iconColor="text-gray-600" />
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#029bba]" /> Reference Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {selectedCase.reference?.externalPropertyName && (
                        <div className="p-3 bg-white rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">External Property</p>
                          <p className="font-semibold">{selectedCase.reference.externalPropertyName}</p>
                          <p className="text-xs text-gray-500">{selectedCase.reference.externalPropertyAddress}</p>
                          <p className="text-xs text-gray-500">{selectedCase.reference.externalPropertyCity}</p>
                        </div>
                      )}
                      {selectedCase.reference?.propertyId && <DetailRow label="Property ID" value={selectedCase.reference.propertyId} />}
                      {selectedCase.reference?.projectId && <DetailRow label="Project ID" value={selectedCase.reference.projectId} />}
                      {selectedCase.reference?.agentId && <DetailRow label="Agent ID" value={selectedCase.reference.agentId} />}
                      {selectedCase.reference?.developerId && <DetailRow label="Developer ID" value={selectedCase.reference.developerId} />}
                      {selectedCase.reference?.societyId && <DetailRow label="Society ID" value={selectedCase.reference.societyId} />}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">{selectedCase.description}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-3">
                    <Link href={`/admin/safedeal/${selectedCase._id}`} className="px-4 py-2 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center">
                      <Edit className="w-4 h-4 mr-2" /> Edit Case
                    </Link>
                    <button onClick={() => confirmDelete(selectedCase._id)} className="px-4 py-2 rounded-xl border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-colors inline-flex items-center">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete SafeDeal Case?</h3>
                  <p className="text-gray-600 mb-6">This will permanently delete the case. This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { setShowDeleteConfirm(false); setCaseToDelete(null); }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
                    <button onClick={executeDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}