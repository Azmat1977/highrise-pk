// pages/admin/inquiries/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  Download,
  Loader2,
  Calendar,
  Plus,
  Trash2,
  Eye,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Clock,
  User,
  Building2,
  MessageCircle,
  Filter,
  MoreVertical,
  Edit3,
  FileText,
  AlertTriangle,
  XCircle,
  PhoneCall,
  CalendarCheck,
  CheckCircle2,
  Ban
} from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

// Types
interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  property?: {
    _id: string;
    title: string;
    price?: number;
    slug?: string;
  };
  propertyTitle?: string;
  propertySlug?: string;
  status: 'new' | 'pending' | 'contacted' | 'scheduled' | 'resolved' | 'closed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assignedTo?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  statusHistory?: Array<{
    status: string;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>;
}

interface Stats {
  all: number;
  new: number;
  pending: number;
  contacted: number;
  scheduled: number;
  resolved: number;
  closed: number;
  cancelled: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Status configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  new: { label: 'New', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: AlertCircle },
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  contacted: { label: 'Contacted', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: PhoneCall },
  scheduled: { label: 'Scheduled', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: CalendarCheck },
  resolved: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: Ban },
};

// Priority configuration
const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// View/Reply Modal Component
function InquiryModal({
  isOpen,
  onClose,
  inquiry,
  onSuccess,
  mode
}: {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onSuccess: () => void;
  mode: 'view' | 'reply' | 'edit';
}) {
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    notes: '',
    assignedTo: '',
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (modalError) {
      const t = setTimeout(() => setModalError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [modalError]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && inquiry) {
      if (mode === 'reply') {
        setEmailData({
          subject: `Re: Inquiry about ${inquiry.property?.title || inquiry.propertyTitle || 'Property'}`,
          message: `Dear ${inquiry.name},\n\nThank you for your inquiry about ${inquiry.property?.title || inquiry.propertyTitle || 'our property'}.\n\n\n\nBest regards,\nHighrise.pk Team`,
        });
      } else if (mode === 'edit') {
        setEditData({
          status: inquiry.status,
          priority: inquiry.priority,
          notes: inquiry.notes || '',
          assignedTo: inquiry.assignedTo || '',
        });
      }
    }
  }, [isOpen, inquiry, mode]);

  const handleSendEmail = async () => {
    if (!inquiry || !emailData.subject || !emailData.message) {
      setModalError('Please fill in subject and message');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/inquiries/${inquiry._id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailData.subject,
          message: emailData.message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setModalError(data.message || 'Failed to send email');
      }
    } catch (error) {
      setModalError('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInquiry = async () => {
    if (!inquiry) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/inquiries/${inquiry._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setModalError(data.message || 'Failed to update inquiry');
      }
    } catch (error) {
      setModalError('Failed to update inquiry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !inquiry) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'view' && 'Inquiry Details'}
              {mode === 'reply' && 'Reply to Inquiry'}
              {mode === 'edit' && 'Edit Inquiry'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] relative">
            {modalError && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-semibold text-center animate-fadeIn">
                {modalError}
              </div>
            )}
            {mode === 'view' && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#029bba]/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-[#029bba]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{inquiry.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{inquiry.email}</p>
                      </div>
                    </div>
                    {inquiry.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium text-gray-900">{inquiry.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">{formatDate(inquiry.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Property</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {inquiry.property?.title || inquiry.propertyTitle || 'N/A'}
                      </p>
                      {inquiry.property?.price && (
                        <p className="text-sm text-gray-500">
                          PKR {inquiry.property.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Message</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{inquiry.message}</p>
                  </div>
                </div>

                {/* Status & Priority */}
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[inquiry.status]?.bgColor} ${statusConfig[inquiry.status]?.color}`}>
                      {React.createElement(statusConfig[inquiry.status]?.icon || AlertCircle, { className: 'w-4 h-4' })}
                      {statusConfig[inquiry.status]?.label || inquiry.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Priority</p>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${priorityConfig[inquiry.priority]?.bgColor} ${priorityConfig[inquiry.priority]?.color}`}>
                      {priorityConfig[inquiry.priority]?.label || inquiry.priority}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {inquiry.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Admin Notes</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{inquiry.notes}</p>
                    </div>
                  </div>
                )}

                {/* Status History */}
                {inquiry.statusHistory && inquiry.statusHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Status History</h3>
                    <div className="space-y-2">
                      {inquiry.statusHistory.map((history, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[history.status]?.bgColor} ${statusConfig[history.status]?.color}`}>
                            {statusConfig[history.status]?.label || history.status}
                          </span>
                          <span className="text-gray-500">
                            by {history.changedBy} � {formatDate(history.changedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'reply' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500">Replying to:</p>
                  <p className="font-medium text-gray-900">{inquiry.name} ({inquiry.email})</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none"
                    placeholder="Type your reply..."
                  />
                </div>
              </div>
            )}

            {mode === 'edit' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                    >
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={editData.assignedTo}
                    onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                    placeholder="e.g., sales@highrise.pk or Sales Team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none"
                    placeholder="Add internal notes about this inquiry..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {mode === 'reply' && (
              <button
                onClick={handleSendEmail}
                disabled={loading}
                className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors font-medium flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Email
              </button>
            )}
            {mode === 'edit' && (
              <button
                onClick={handleUpdateInquiry}
                disabled={loading}
                className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors font-medium flex items-center disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Status Update Dropdown
function StatusDropdown({ 
  inquiry, 
  onUpdate 
}: { 
  inquiry: Inquiry;
  onUpdate: (id: string, status: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[inquiry.status]?.bgColor} ${statusConfig[inquiry.status]?.color} hover:opacity-80 transition-opacity`}
      >
        {React.createElement(statusConfig[inquiry.status]?.icon || AlertCircle, { className: 'w-3.5 h-3.5' })}
        {statusConfig[inquiry.status]?.label}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
            {Object.entries(statusConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  onUpdate(inquiry._id, key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  inquiry.status === key ? 'bg-gray-50' : ''
                }`}
              >
                {React.createElement(config.icon, { className: `w-4 h-4 ${config.color}` })}
                <span>{config.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Main Component
function InquiriesContent() {
  const router = useRouter();

  // State
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    all: 0, new: 0, pending: 0, contacted: 0, 
    scheduled: 0, resolved: 0, closed: 0, cancelled: 0
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 10, total: 0, totalPages: 0
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals
  const [inquiryModal, setInquiryModal] = useState<{
    isOpen: boolean;
    mode: 'view' | 'reply' | 'edit';
    inquiry: Inquiry | null;
  }>({
    isOpen: false,
    mode: 'view',
    inquiry: null
  });
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    inquiry: Inquiry | null;
    isBulk: boolean;
  }>({
    isOpen: false,
    inquiry: null,
    isBulk: false
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch inquiries
  const fetchInquiries = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearch
      });

      const response = await fetch(`/api/inquiries?${params}`);
      const data = await response.json();

      if (data.success) {
        setInquiries(data.data || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages
          }));
        }
      } else {
        setBanner({ message: data.message || 'Failed to load inquiries', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setBanner({ message: 'Failed to load inquiries', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, pagination.page, pagination.limit, debouncedSearch]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Export CSV
  const exportCSV = () => {
    if (inquiries.length === 0) {
      setBanner({ message: 'No inquiries to export', type: 'error' });
      return;
    }

    const csv = [
      ['Name', 'Email', 'Phone', 'Property', 'Status', 'Priority', 'Date', 'Message'],
      ...inquiries.map(inq => [
        inq.name,
        inq.email,
        inq.phone || '',
        inq.property?.title || inq.propertyTitle || 'N/A',
        inq.status,
        inq.priority,
        formatDate(inq.createdAt),
        inq.message.substring(0, 100)
      ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setBanner({ message: 'CSV exported successfully!', type: 'success' });
  };

  // Handle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map(i => i._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Update status
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setBanner({ message: `Status updated to ${statusConfig[newStatus]?.label || newStatus}`, type: 'success' });
        fetchInquiries();
      } else {
        setBanner({ message: data.message || 'Failed to update status', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to update status', type: 'error' });
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch(`/api/inquiries/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );

      const successCount = results.filter(r => r.ok).length;
      setBanner({ message: `${successCount} inquiries updated to ${statusConfig[newStatus]?.label}`, type: 'success' });
      setSelectedIds([]);
      fetchInquiries();
    } catch (error) {
      setBanner({ message: 'Failed to update some inquiries', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete inquiry
  const handleDelete = async () => {
    if (!deleteModal.inquiry && !deleteModal.isBulk) return;

    setActionLoading(true);
    try {
      if (deleteModal.isBulk) {
        const results = await Promise.all(
          selectedIds.map(id =>
            fetch(`/api/inquiries/${id}`, { method: 'DELETE' })
          )
        );

        const successCount = results.filter(r => r.ok).length;
        setBanner({ message: `${successCount} inquiries deleted!`, type: 'success' });
        setSelectedIds([]);
      } else if (deleteModal.inquiry) {
        const response = await fetch(`/api/inquiries/${deleteModal.inquiry._id}`, {
          method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
          setBanner({ message: 'Inquiry deleted!', type: 'success' });
        } else {
          setBanner({ message: data.message || 'Failed to delete', type: 'error' });
        }
      }

      fetchInquiries();
      setDeleteModal({ isOpen: false, inquiry: null, isBulk: false });
    } catch (error) {
      setBanner({ message: 'Failed to delete inquiry', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      setSelectedIds([]);
    }
  };

  // Tabs configuration
  const tabs = [
    { key: 'all', label: 'All', count: stats.all },
    { key: 'new', label: 'New', count: stats.new },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'contacted', label: 'Contacted', count: stats.contacted },
    { key: 'scheduled', label: 'Scheduled', count: stats.scheduled },
    { key: 'resolved', label: 'Resolved', count: stats.resolved },
    { key: 'closed', label: 'Closed', count: stats.closed },
  ];

  return (
    <div className="p-6 space-y-6 relative">
      {banner && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
            banner.type === 'success'
              ? 'bg-[#004063] text-white border border-[#029bba]/30'
              : 'bg-red-600 text-white'
          }`}
        >
          <span>{banner.message}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Inquiries</h1>
          <p className="text-gray-500 mt-1">Manage and respond to customer inquiries</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchInquiries(true)}
            disabled={refreshing}
            className="p-2.5 text-gray-500 hover:text-[#029bba] hover:bg-gray-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#029bba]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.all}</p>
              <p className="text-gray-500 text-xs">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
              <p className="text-gray-500 text-xs">New</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-gray-500 text-xs">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.contacted}</p>
              <p className="text-gray-500 text-xs">Contacted</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-gray-500 text-xs">Scheduled</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-gray-500 text-xs">Resolved</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPagination(prev => ({ ...prev, page: 1 }));
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  statusFilter === tab.key
                    ? 'bg-[#029bba] text-white shadow-lg shadow-[#029bba]/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-xs ${
                  statusFilter === tab.key ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full lg:w-72 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkStatusUpdate('contacted')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                Mark Contacted
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('resolved')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('closed')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Mark Closed
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, inquiry: null, isBulk: true })}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors ml-auto"
            >
              Clear Selection
            </button>
          </div>
        )}
      </Card>

      {/* Inquiries Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No inquiries found</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try a different search term'
                : 'When customers submit inquiries, they will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === inquiries.length && inquiries.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inquiries.map((inquiry) => (
                    <tr 
                      key={inquiry._id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedIds.includes(inquiry._id) ? 'bg-[#029bba]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(inquiry._id)}
                          onChange={() => toggleSelect(inquiry._id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#027a94] flex items-center justify-center text-white font-medium">
                            {inquiry.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{inquiry.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Mail className="w-3 h-3" />
                              {inquiry.email}
                            </div>
                            {inquiry.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Phone className="w-3 h-3" />
                                {inquiry.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <p className="font-medium text-gray-900 truncate">
                            {inquiry.property?.title || inquiry.propertyTitle || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {inquiry.message.substring(0, 50)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusDropdown 
                          inquiry={inquiry} 
                          onUpdate={handleStatusUpdate}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${priorityConfig[inquiry.priority]?.bgColor} ${priorityConfig[inquiry.priority]?.color}`}>
                          {priorityConfig[inquiry.priority]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(inquiry.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setInquiryModal({ isOpen: true, mode: 'view', inquiry })}
                            className="p-2 text-gray-400 hover:text-[#029bba] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setInquiryModal({ isOpen: true, mode: 'reply', inquiry })}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Reply"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setInquiryModal({ isOpen: true, mode: 'edit', inquiry })}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, inquiry, isBulk: false })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} inquiries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          pagination.page === pageNum
                            ? 'bg-[#029bba] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* View/Reply/Edit Modal */}
      <InquiryModal
        isOpen={inquiryModal.isOpen}
        onClose={() => setInquiryModal({ isOpen: false, mode: 'view', inquiry: null })}
        inquiry={inquiryModal.inquiry}
        onSuccess={() => fetchInquiries()}
        mode={inquiryModal.mode}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, inquiry: null, isBulk: false })}
        onConfirm={handleDelete}
        title={deleteModal.isBulk ? 'Delete Selected Inquiries?' : 'Delete Inquiry?'}
        message={
          deleteModal.isBulk
            ? `Are you sure you want to permanently delete ${selectedIds.length} selected inquiries? This action cannot be undone.`
            : `Are you sure you want to permanently delete this inquiry from "${deleteModal.inquiry?.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}

// Main Export
export default function AdminInquiriesPage() {
  return (
    <AdminGuard>
      <AdminLayout>
        <InquiriesContent />
      </AdminLayout>
    </AdminGuard>
  );
}
